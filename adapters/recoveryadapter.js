const path = require('path');
const logger = require('log4js').getLogger(path.basename(__filename));
const DataStore = require('nedb');

/**
 * VC復帰情報読み書きアダプタ
 */
class RecoveryAdapter {
    constructor() {
        const db = new DataStore({ filename: './db/recovery.db', autoload: true });
        db.persistence.setAutocompactionInterval(86400000);
        this.db = db;
    }

    saveRecoveryInfo(serverId, voiceChannelId, textChannelId) {
        const newRecord = {
            segment: serverId,
            voice: voiceChannelId,
            text: textChannelId,
        };
        return new Promise((resolve, reject) =>
            this.db.insert(newRecord, (err, doc) => {
                if (err) {
                    reject(err);
                } else {
                    resolve();
                }
            })
        );
    }

    listRecoveryInfo() {
        const functor = doc =>
            Object.assign({}, { serverId: doc.segment, voiceChannelId: doc.voice, textChannelId: doc.text });
        return new Promise((resolve, reject) =>
            this.db.find({}, (err, docs) => {
                if (err) {
                    reject(err);
                } else {
                    if (docs.length > 0) {
                        logger.info(`${docs.length} 件のリカバリ情報を取得しました。`);
                    }
                    resolve(Array.prototype.map.call(docs, functor));
                }
            })
        );
    }

    clearRecoveryInfo() {
        return new Promise((resolve, reject) =>
            this.db.remove({}, { multi: true }, (err, count) => {
                if (err) {
                    reject(err);
                } else {
                    if (count > 0) {
                        logger.info(`${count} 件のリカバリ情報を削除しました。`);
                    }
                    resolve();
                }
            })
        );
    }
}

/**
 * VC復帰処理マネージャ
 */
class RecoveryAdapterManager {
    /**
     * 初期化処理
     */
    static init() {
        this.adapter = new RecoveryAdapter();
    }

    /**
     * VC復帰情報
     *
     * @typedef RecoveryInfo
     * @type {object}
     * @property {string} serverId
     * @property {string} voiceChannelId
     * @property {string} textChannelId
     */

    /**
     * VC復帰処理を行う（移譲）
     *
     * @param {function(RecoveryInfo):(void|Promise<void>)} doRecover
     */
    static async recover(doRecover) {
        const infos = await this.adapter.listRecoveryInfo();
        if (infos.length === 0) {
            return Promise.resolve();
        }
        const ps = infos.map(info => Promise.resolve(doRecover(info)));
        await Promise.all(ps);
        await this.adapter.clearRecoveryInfo();

        return Promise.resolve();
    }

    /**
     * VC復帰を予約
     *
     * @param {object[]} regs
     * @param {string} regs[].serverId
     * @param {string} regs[].voiceChannelId
     * @param {string} regs[].textChannelId
     * @returns {Promise<void>}
     */
    static async book(...regs) {
        if (regs.length === 0) return Promise.resolve();

        const andthen = (acc, reg) =>
            acc.then(() => this.adapter.saveRecoveryInfo(reg.serverId, reg.voiceChannelId, reg.textChannelId));
        await regs.reduce(andthen, Promise.resolve());
        logger.info(`${regs.length} 件のリカバリ情報を保存しました。`);
        return Promise.resolve();
    }
}

module.exports = {
    RecoveryAdapterManager,
};

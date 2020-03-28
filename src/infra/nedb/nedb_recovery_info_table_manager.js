const path = require('path');
const logger = require('log4js').getLogger(path.basename(__filename));
const assert = require('assert').strict;
const uuid = require('uuidv4').uuid;
const Datastore = require('nedb');
const RecoveryInfo = require('../../domain/entity/recovery_info');
const IRecoveryInfoRepo = require('../../domain/repo/i_recovery_info_repo');

/**
 * @typedef Record
 * @type {object}
 * @property {string} segment DiscordサーバーID
 * @property {string} voice 通話チャンネルID
 * @property {string} text 読み上げチャンネルID
 */

/**
 * Nedbのインスタンス
 *
 * @type {Nedb}
 */
let dbInstance;

/**
 * モジュールの初回呼び出しフラグ
 *
 * @type {boolean}
 */
let firstCall = true;

/**
 * モジュールの初期化（実際にこの実装がDIされるまで初期化処理を遅延させる）
 */
function init() {
    // Nedbのロード
    dbInstance = new Datastore({ filename: './db/recovery.db', autoload: true });
    dbInstance.loadDatabase();
    dbInstance.persistence.setAutocompactionInterval(86400000);

    logger.trace('モジュールが初期化された');
}

/**
 * RecoveryInfoからDBレコードを生成
 *
 * @param {RecoveryInfo} info
 * @returns {Record}
 */
function toRecord(info) {
    return {
        segment: info.serverId,
        voice: info.voiceChannelId,
        text: info.readingChannelsId[0],
    };
}

/**
 * DBレコードからRecoveryInfoを生成
 *
 * @param {Record} record
 * @returns {RecoveryInfo}
 */
function toRecoveryInfo(record) {
    return new RecoveryInfo({
        id: uuid(),
        serverId: record.segment,
        voiceChannelId: record.voice,
        readingChannelsId: [record.text],
    });
}

/**
 * Nedbリカバリ情報テーブルマネージャ
 *
 * @implements {IRecoveryInfoRepo}
 */
class NedbRecoveryInfoTableManager {
    /**
     * DIコンテナ用コンストラクタ
     * 初回呼び出し時にはモジュール初期化を行う
     */
    constructor() {
        if (firstCall) {
            firstCall = false;
            init();
        }
    }

    /**
     * (impl) IRecoveryInfoRepo
     *
     * @param {RecoveryInfo} info
     * @returns {Promise<void>}
     */
    async saveRecoveryInfo(info) {
        assert(typeof info === 'object');

        const newRecord = toRecord(info);
        return new Promise((resolve, reject) =>
            dbInstance.insert(newRecord, err => {
                if (err) {
                    reject(err);
                } else {
                    resolve();
                }
            })
        );
    }

    /**
     * (impl) IRecoveryInfoRepo
     *
     * @returns {Promise<Array<RecoveryInfo>>}
     */
    async loadAllRecoveryInfo() {
        return new Promise((resolve, reject) =>
            dbInstance.find({}, (err, docs) => {
                if (err) {
                    reject(err);
                } else {
                    if (docs.length > 0) {
                        logger.info(`${docs.length} 件のリカバリ情報を取得しました。`);
                    }
                    resolve(Array.prototype.map.call(docs, toRecoveryInfo));
                }
            })
        );
    }

    /**
     * (impl) IRecoveryInfoRepo
     *
     * @returns {Promise<void>}
     */
    async deleteAllRecoveryInfo() {
        return new Promise((resolve, reject) =>
            dbInstance.remove({}, { multi: true }, (err, count) => {
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

// IRecoveryInfoRepoの実装として登録
IRecoveryInfoRepo.comprise(NedbRecoveryInfoTableManager);

module.exports = NedbRecoveryInfoTableManager;

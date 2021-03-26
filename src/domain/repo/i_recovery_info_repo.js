const Interface = require('../../core/interface');

/** @typedef {import('../entity/recovery_info')} RecoveryInfo */

/**
 * 花子のボイスチャット復帰情報リポジトリ
 */
class IRecoveryInfoRepo extends Interface {
    /**
     * すべてのボイスチャット復帰情報を読み出し
     *
     * @returns {Promise<Array<RecoveryInfo>>} すべてのボイスチャット復帰情報
     */
    async loadAllRecoveryInfo() {}

    /**
     * すべてのボイスチャット復帰情報を削除
     *
     * @returns {Promise<void>}
     */
    async deleteAllRecoveryInfo() {}

    /**
     * ボイスチャット復帰情報を保存
     *
     * @param {RecoveryInfo} info 保存するボイスチャット復帰情報
     * @returns {Promise<void>}
     */
    async saveRecoveryInfo(info) {}
}

module.exports = IRecoveryInfoRepo;

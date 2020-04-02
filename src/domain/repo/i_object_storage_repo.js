const Interface = require('../../core/interface');

/** @typedef {import('stream').Readable} Readable */

/**
 * 花子が利用するオブジェクトストレージのインターフェース
 */
class IObjectStorageRepo extends Interface {
    /**
     * オブジェクトストレージにファイルデータを保存
     *
     * @param {string} segmentKey セグメントキー
     * @param {string} objectKey オブジェクトキー
     * @param {string} fileType ファイル種類
     * @param {Readable} dataStream 実データのストリーム
     * @returns {Promise<void>}
     */
    async saveFile(segmentKey, objectKey, fileType, dataStream) {}

    /**
     * オブジェクトストレージからファイルデータのストリームを取得
     *
     * @param {string} segmentKey セグメントキー
     * @param {string} objectKey オブジェクトキー
     * @param {string} fileType ファイル種類
     * @returns {Promise<Readable>} 実データのストリーム
     */
    async readFile(segmentKey, objectKey, fileType) {}

    /**
     * オブジェクトストレージからファイルデータを削除
     *
     * @param {string} segmentKey セグメントキー
     * @param {string} objectKey オブジェクトキー
     * @param {string} fileType ファイル種類
     * @returns {Promise<void>}
     */
    async deleteFile(segmentKey, objectKey, fileType) {}
}

module.exports = IObjectStorageRepo;

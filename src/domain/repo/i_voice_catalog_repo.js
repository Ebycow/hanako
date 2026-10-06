const Interface = require('../../core/interface');

/** @typedef {import('../entity/voice_catalog')} VoiceCatalog */

/**
 * 読み上げキャラクター（話者）
 *
 * @typedef VoiceInfo
 * @type {object}
 * @property {string} address 話者の指定（設定に保存する値。`voicevox:ずんだもん/あまあま` など）
 * @property {string} displayName 表示名
 * @property {?string} engine 音声エンジンの名前（わからなければ null）
 * @property {?string} credit 必要なクレジット表記（不要なら null）
 * @property {?string} [termsUrl] 利用規約の URL（わからなければ null）
 */

/**
 * 話者の照合結果
 *
 * @typedef VoiceResolution
 * @type {object}
 * @property {?VoiceInfo} voice 決まった話者。見つからなければ null
 * @property {Array<VoiceInfo>} suggestions 見つからなかったときの候補
 */

/**
 * 読み上げキャラクター（話者）の一覧のリポジトリ
 */
class IVoiceCatalogRepo extends Interface {
    /**
     * 入力中の文字列から話者を検索する
     * 入力にパラメータ（`?speed=1.2` など）が付いていれば、見つかった話者の指定と表示名にも付ける
     *
     * @param {string} input 入力中の文字列（空なら先頭から）
     * @param {number} limit 最大件数
     * @returns {Promise<Array<VoiceInfo>>} 見つかった話者
     */
    async searchVoices(input, limit) {}

    /**
     * 利用者の入力（あいまいでもよい）を話者に照合する
     *
     * @param {string} query 利用者の入力
     * @returns {Promise<VoiceResolution>} 照合結果
     */
    async resolveVoice(query) {}

    /**
     * 話者の一覧を読み込む
     * - 一覧を持たない環境か、取得できなかったとき errors.disappointed
     *
     * @returns {Promise<VoiceCatalog>} 話者の一覧
     */
    async loadVoiceCatalog() {}
}

module.exports = IVoiceCatalogRepo;

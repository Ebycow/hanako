const Interface = require('../../core/interface');

/** @typedef {import('../entity/actions/max_count_update_action')} MaxCountUpdateAction */
/** @typedef {import('../entity/actions/speaker_update_action')} SpeakerUpdateAction */

/**
 * 読み上げ花子設定関連アクションのリポジトリ
 */
class ISettingsActionRepo extends Interface {
    /**
     * 最大読み上げ文字数更新アクションを投稿
     *
     * @param {MaxCountUpdateAction} action 最大読み上げ文字数更新アクション
     * @returns {Promise<void>}
     */
    async postMaxCountUpdate(action) {}

    /**
     * サーバー読み上げキャラクター更新アクションを投稿
     *
     * @param {SpeakerUpdateAction} action サーバー読み上げキャラクター更新アクション
     * @returns {Promise<void>}
     */
    async postSpeakerUpdate(action) {}
}

module.exports = ISettingsActionRepo;

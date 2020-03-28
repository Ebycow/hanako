const Interface = require('../../core/interface');

/** @typedef {import('../entity/actions/max_count_update_action')} MaxCountUpdateAction */

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
}

module.exports = ISettingsActionRepo;

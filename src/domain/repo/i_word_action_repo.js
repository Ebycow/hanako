const Interface = require('../../core/interface');

/** @typedef {import('../entity/actions/word_create_action')} WordCreateAction */
/** @typedef {import('../entity/actions/word_delete_action')} WordDeleteAction */
/** @typedef {import('../entity/actions/word_clear_action'))} WordClearAction */

/**
 * 教育単語関連アクションのリポジトリ
 */
class IWordActionRepo extends Interface {
    /**
     * 教育単語追加アクションを投稿
     *
     * @param {WordCreateAction} action 教育単語追加アクション
     * @returns {Promise<void>}
     */
    async postWordCreate(action) {}

    /**
     * 教育単語削除アクションを投稿
     *
     * @param {WordDeleteAction} action 教育単語削除アクション
     * @returns {Promise<void>}
     */
    async postWordDelete(action) {}

    /**
     * 教育単語初期化アクションを投稿
     *
     * @param {WordClearAction} action 教育単語初期化アクション
     * @returns {Promise<void>}
     */
    async postWordClear(action) {}
}

module.exports = IWordActionRepo;

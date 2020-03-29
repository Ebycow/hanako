const Interface = require('../../core/interface');

/** @typedef {import('../entity/actions/silence_create_action')} SilenceCreateAction */
/** @typedef {import('../entity/actions/silence_delete_action')} SilenceDeleteAction */
/** @typedef {import('../entity/actions/silence_clear_action')} SilenceClearAction */

/**
 * 沈黙ユーザー関連アクションのリポジトリ
 */
class ISilenceActionRepo extends Interface {
    /**
     * 沈黙ユーザー追加アクションを投稿
     *
     * @param {SilenceCreateAction} action 沈黙ユーザー追加アクション
     * @returns {Promise<void>}
     */
    async postSilenceCreate(action) {}

    /**
     * 沈黙ユーザー削除アクションを投稿
     *
     * @param {SilenceDeleteAction} action 沈黙ユーザー削除アクション
     * @returns {Promise<void>}
     */
    async postSilenceDelete(action) {}

    /**
     * 沈黙ユーザー初期化アクションを投稿
     *
     * @param {SilenceClearAction} action 沈黙ユーザー初期化アクション
     * @returns {Promise<void>}
     */
    async postSilenceClear(action) {}
}

module.exports = ISilenceActionRepo;

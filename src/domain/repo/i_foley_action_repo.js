const Interface = require('../../core/interface');

/** @typedef {import('../entity/actions/foley_create_action')} FoleyCreateAction */
/** @typedef {import('../entity/actions/foley_create_multiple_action')} FoleyCreateMultipleAction */
/** @typedef {import('../entity/actions/foley_delete_action')} FoleyDeleteAction */
/** @typedef {import('../entity/actions/foley_delete_multiple_action')} FoleyDeleteMultipleAction */
/** @typedef {import('../entity/actions/foley_rename_action')} FoleyRenameAction */

/**
 * SE関連アクションのリポジトリ
 */
class IFoleyActionRepo extends Interface {
    /**
     * SE追加アクションを投稿
     *
     * @param {FoleyCreateAction} action SE追加アクション
     * @returns {Promise<void>}
     */
    async postFoleyCreate(action) {}

    /**
     * 複数SE追加アクションを投稿
     *
     * @param {FoleyCreateMultipleAction} action 複数SE追加アクション
     * @returns {Promise<void>}
     */
    async postFoleyCreateMultiple(action) {}

    /**
     * SE削除アクションを投稿
     *
     * @param {FoleyDeleteAction} action SE削除アクション
     * @returns {Promise<void>}
     */
    async postFoleyDelete(action) {}

    /**
     * 複数SE削除アクションを投稿
     *
     * @param {FoleyDeleteMultipleAction} action 複数SE削除アクション
     * @returns {Promise<void>}
     */
    async postFoleyDeleteMultiple(action) {}

    /**
     * SE削除アクションを投稿
     *
     * @param {FoleyRenameAction} action SE削除アクション
     * @returns {Promise<void>}
     */
    async postFoleyRename(action) {}
}

module.exports = IFoleyActionRepo;

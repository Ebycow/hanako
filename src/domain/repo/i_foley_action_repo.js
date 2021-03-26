const Interface = require('../../core/interface');

/** @typedef {import('../entity/actions/foley_create_action')} FoleyCreateAction */
/** @typedef {import('../entity/actions/foley_delete_action')} FoleyDeleteAction */

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
     * SE削除アクションを投稿
     *
     * @param {FoleyDeleteAction} action SE削除アクション
     * @returns {Promise<void>}
     */
    async postFoleyDelete(action) {}
}

module.exports = IFoleyActionRepo;

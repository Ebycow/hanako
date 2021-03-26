const Interface = require('../../core/interface');

/**
 * ドメインサービス
 * 読み上げ花子終了時処理の委譲
 */
class IShutdownDelegator extends Interface {
    /**
     * 読み上げ花子アプリケーションの終了時処理を委譲する
     *
     * @param {function(void):Promise<void>} func 委譲する非同期処理
     * @returns {Promise<void>}
     */
    async delegate(func) {}
}

module.exports = IShutdownDelegator;

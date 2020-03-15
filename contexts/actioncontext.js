/**
 * アクションコンテキスト
 */
class ActionContext {
    /**
     * @param {object} options
     */
    constructor(options) {
        // 今は必要じゃないかもしれないけど
        // ひとつの on('message') 実行単位 <-> ひとつの MessageContext
        // と同じ構造になっておきたい
    }
}

module.exports = {
    ActionContext,
};

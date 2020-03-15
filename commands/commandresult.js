/**
 * コマンド結果のデータクラス
 * 現在は返信メッセージのみですが、今後コマンドが増えた場合の拡張の余地を残します。
 */
class CommandResult {
    /**
     * @param {string} resultType
     * @param {string?} replyText
     * @param {string?} contentType
     */
    constructor(resultType, replyText, contentType) {
        /**
         * @type {string}
         * @readonly
         */
        this.resultType = resultType;

        /**
         * @type {string?}
         * @readonly
         */
        this.replyText = replyText ? replyText : null;

        /**
         * @type {string}
         * @readonly
         */
        this.contentType = contentType ? contentType : null;
    }
}

const ResultType = {
    SUCCESS: 'success',
    INVALID_ARGUMENT: 'error invalid argument',
    ALREADY_EXISTS: 'error already exists',
    REQUIRE_CONFIRM: 'error require confirm',
    REQUIRE_JOIN: 'error require channel join',
    NOT_FOUND: 'error not found',
};

const ContentType = {
    PAGER: 'pager',
};

module.exports = {
    CommandResult,
    ResultType,
    ContentType,
};

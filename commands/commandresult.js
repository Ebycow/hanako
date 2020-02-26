/**
 * コマンド結果のデータクラス
 * 現在は返信メッセージのみですが、今後コマンドが増えた場合の拡張の余地を残します。
 */
class CommandResult {
    /**
     * @param {string} resultType
     * @param {string?} replyText
     */
    constructor(resultType, replyText) {
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

module.exports = {
    CommandResult,
    ResultType,
};

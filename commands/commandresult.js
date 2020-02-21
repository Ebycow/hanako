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
    NOT_FOUND: 'error not found',
    PRECONDITION_FAIL: 'error precondition fail'
};

module.exports = {
    CommandResult, ResultType
};

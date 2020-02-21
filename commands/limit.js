const assert = require('assert').strict;
const { MessageContext } = require('../contexts/messagecontext');
const { ReplaciveCommand, CommandNames } = require('./command');
const { CommandResult, ResultType } = require('./commandresult');

class LimitCommand extends ReplaciveCommand {

    constructor() {
        super();
        /**
         * @type {number}
         * @private
         */
        this.wordLimit = 120;
    }

    /**
     * @param {MessageContext} context
     * @param {string} name
     * @param {string[]} args
     * @returns {CommandResult} 
     * @override
     */
    process(context, name, args) {
        assert(name === CommandNames.LIMIT);

        if (args.length > 0) {
            const num = parseInt(args[0], 10);
            if (isNaN(num)) {
                return new CommandResult(ResultType.INVALID_ARGUMENT, null);
            }
            // TODO: numは青天井で大丈夫？
            this.wordLimit = num | 0;       
        } else {
            // 引数が指定されなかったときの処理
            this.wordLimit = 9999; // TODO: 数値はこのままで大丈夫？
        }

        return new CommandResult(ResultType.SUCCESS, `読み上げる文字数を${this.wordLimit}文字に制限しました :no_entry:`);
    }

    /**
     * @param {string} message 
     * @param {Object} [options={}]
     * @returns {string}
     * @override
     */
    replace(message, options = {}) {
        if(message.length > this.wordLimit) {
            message = message.substr(0, this.wordLimit) + "イか略。"; // 発音が良い
        }

        return message;
    }

    /**
     * @returns {number}
     * @override
     */
    replacePriority() { 
        return 0xFFFF;
    }

}

module.exports = {
    LimitCommand
};

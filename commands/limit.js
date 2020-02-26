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
        assert(() => {
            for (const cmdName of CommandNames.LIMIT) {
                if (name === cmdName) {
                    return true;
                }
            }

            return false;
        });

        const MAX_LIMIT = 9999;
        if (args.length > 0) {
            const num = parseInt(args[0], 10);
            if (isNaN(num)) {
                return new CommandResult(ResultType.INVALID_ARGUMENT, null);
            }
            this.wordLimit = num < 0 ? 0 : num < MAX_LIMIT ? num : MAX_LIMIT;
        } else {
            // 引数が指定されなかったときの処理
            this.wordLimit = MAX_LIMIT;
        }

        return new CommandResult(
            ResultType.SUCCESS,
            `読み上げる文字数を${this.wordLimit}文字に制限しました :no_entry:`
        );
    }

    /**
     * @param {MessageContext} context
     * @param {string} message
     * @returns {string}
     * @override
     */
    replace(context, message) {
        if (this.wordLimit === 0) {
            return '';
        } else if (message.length > this.wordLimit) {
            const splitMessage = message.split(/(:.+?:)/);
            message = '';
            for (const str of splitMessage) {
                message += str;

                if ((message + str).length >= this.wordLimit) {
                    break;
                }
            }
            message = message.substr(0, this.wordLimit) + 'イか略。'; // 発音が良い
        }

        return message;
    }

    /**
     * @returns {number}
     * @override
     */
    replacePriority() {
        return 0xffff;
    }
}

module.exports = {
    LimitCommand,
};

const assert = require('assert').strict;
const { Command, CommandNames } = require('./command');
const { CommandResult, ResultType } = require('./commandresult');
const { MessageContext } = require('../contexts/messagecontext');

/**
 * 成敗コマンド
 */
class SeibaiCommand extends Command {

    /**
     * @param {MessageContext} context 
     * @param {string} name 
     * @param {string[]} args 
     * @returns {Promise<CommandResult>} 
     * @override 
     */
    async process(context, name, args) {
        assert(name === CommandNames.SEIBAI);

        if (context.isSpeaking()) {
            if (context.queueLength() > 0) {
                context.queuePurge();
            }            
            await context.voiceCancel('seibai');
            return new CommandResult(ResultType.SUCCESS, '戯け者 余の顔を見忘れたか :knife:');

        } else {
            // 一応異常系だけど今まで通り握りつぶしてます
            return new CommandResult(ResultType.SUCCESS, '安心せい、みねうちにゃ… :knife:');
        }
    }

    /**
     * @param {string} text 
     * @returns {string} 
     * @override
     */
    replace(text) { 
        // pass through
        return text;
    }

    /**
     * @returns {number}
     * @override
     */
    replacePriority() {
        return 0x00AA;
    }

}

module.exports = {
    SeibaiCommand
};

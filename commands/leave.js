const assert = require('assert').strict;
const { Command, CommandNames } = require('./command');
const { CommandResult, ResultType } = require('./commandresult');
const { MessageContext } = require('../contexts/messagecontext');

/**
 * VC切断コマンド
 */
class LeaveCommand extends Command {

    /**
     * @param {MessageContext} context 
     * @param {string} name 
     * @param {string[]} args 
     * @returns {CommandResult} 
     * @override 
     */
    process(context, name, args) {
        assert(name === CommandNames.LEAVE);
        
        if(context.isJoined()) {
            if (context.queueLength() > 0) {
                context.queuePurge();
            }
            context.voiceLeave();
        } else {
            return new CommandResult(ResultType.PRECONDITION_FAIL, "どこのチャンネルにも参加していないか、エラーが発生しています :sob:");
        }
    }

}

module.exports = {
    LeaveCommand
};

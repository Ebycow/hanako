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
        assert(() => {
            for (const cmdName of CommandNames.LEAVE) {
                if(name === cmdName){
                    return true;
                }
            }

            return false;
            
        });
        
        if(context.isJoined()) {
            if (context.queueLength() > 0) {
                context.queuePurge();
            }
            context.voiceLeave();
            return new CommandResult(ResultType.SUCCESS, null);
        } else {
            return new CommandResult(ResultType.REQUIRE_CONFIRM, "どこのチャンネルにも参加していないか、エラーが発生しています :sob:");
        }
    }

}

module.exports = {
    LeaveCommand
};

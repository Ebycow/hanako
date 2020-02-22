const assert = require('assert').strict;
const { Command, CommandNames } = require('./command');
const { CommandResult, ResultType } = require('./commandresult');
const { MessageContext } = require('../contexts/messagecontext');

/**
 * 里見コマンド
 */
class AskCommand extends Command {

    /**
     * @param {MessageContext} context 
     * @param {string} name 
     * @param {string[]} args 
     * @returns {CommandResult} 
     * @override 
     */
    process(context, name, args) {
        assert(() => {
            for (const cmdName of CommandNames.ASK) {
                if(name === cmdName){
                    return true;
                }
            }

            return false;
            
        });
        
        if (Math.random() >= 0.5) {
            return new CommandResult(ResultType.SUCCESS, 'はい');
        } else {
            return new CommandResult(ResultType.SUCCESS, 'いいえ');
        }
    }

}

module.exports = {
    AskCommand
};

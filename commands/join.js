const assert = require('assert').strict;
const { Command, CommandNames } = require('./command');
const { CommandResult, ResultType } = require('./commandresult');
const { MessageContext } = require('../contexts/messagecontext');

/**
 * VC参加コマンド
 */
class JoinCommand extends Command {

    /**
     * @param {MessageContext} context 
     * @param {string} name 
     * @param {string[]} args 
     * @returns {Promise<CommandResult>} 
     * @override 
     */
    async process(context, name, args) {
        assert(() => {
            for (const cmdName of CommandNames.JOIN) {
                if(name === cmdName){
                    return true;
                }
            }

            return false;
            
        });

        if (context.isAuthorInVC) {
            const link = await context.voiceJoin();
            return new CommandResult(ResultType.SUCCESS, `${link}に参加したよ、よろしくね`);
        } else if (context.isJoined()) {
            return new CommandResult(ResultType.REQUIRE_CONFIRM, 'すでに通話チャンネルに参加済みですよ、「さようなら」とリプライすると切断します');
        } else {
            return new CommandResult(ResultType.REQUIRE_CONFIRM, '通話チャンネルに参加してから呼んでね！');
        }
    }
    
}

module.exports = {
    JoinCommand
};

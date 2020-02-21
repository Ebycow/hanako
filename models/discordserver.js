const assert = require('assert').strict;
const discord = require('discord.js');
const { Commands } = require('../commands/commands');
const { CommandResult, ResultType } = require('../commands/commandresult');
const { MessageContext } = require('../contexts/messagecontext');

const CommandDelimiterRegexp = new RegExp('[ 　]+');

class DiscordServer {
    
    /**
     * @param {discord.Guild} guild 
     */
    constructor(guild) {
        console.log(guild.id);
        /**
         * @type {string}
         * @readonly
         */
        this.commandKey = '$';

        /**
         * @type {string}
         * @private
         */
        this.id = guild.id;

        /**
         * @type {discord.ClientUser}
         * @private
         */
        this.botUser = guild.client.user;
    
        /**
         * @type {Commands}
         * @private
         */
        this.commands = new Commands(guild);
    }

    /**
     * @param {MessageContext} context
     * @param {discord.Message} message 
     * @returns {Promise<CommandResult>}
     */
    handleMessage(context, message) {
        assert(this.isCommandMessage(message));

        const args = this._parseCommandArgument(message);
        console.log(args);
        if (args.length === 0) {
            return Promise.resolve(new CommandResult(ResultType.INVALID_ARGUMENT, null));
        }

        if (this.commands.has(args[0])) {
            const command = this.commands.get(args[0]);
            const result = command.process(context, args[0], args.slice(1));
            return Promise.resolve(result);
        } else {
            // 対応するコマンドがなかったときの処理
            return Promise.resolve(new CommandResult(ResultType.SUCCESS, null)); // TODO: 握りつぶしでOK？
        }
    }

    /**
     * @param {discord.Message} message
     * @returns {boolean} 
     */
    isCommandMessage(message) {
        return message.isMemberMentioned(this.botUser) || message.content.startsWith(this.commandKey);
    }

    /**
     * @param {MessageContext} context
     * @param {string} _text
     * @returns {string} 
     */
    handleReplace(context, _text) {
        const replacives = this.commands.replacives.sort((a, b) => {
            if (a.replacePriority() < b.replacePriority()) {
                return -1;
            } else if (a.replacePriority() > b.replacePriority()) {
                return 1;
            } else {
                return 0;
            }
        });

        let text = _text;
        for (let i = 0, len = replacives.length; i < len; i++) {
            text = replacives[i].replace(context, text);
        }

        return text;
    }

    /**
     * @param {discord.Message} message
     * @returns {string[]}
     * @private 
     */
    _parseCommandArgument(message) {
        if (message.content.startsWith(this.commandKey)) {
            // "?teach 里見 あおもり" 形式のコマンド
            const pureText = message.content.slice(this.commandKey.length).trimRight();
            return pureText.split(CommandDelimiterRegexp);
        } else {
            // "@Hanako teach 里見 あおもり" 形式のコマンド
            const splitText = message.content.trim().split(CommandDelimiterRegexp);
            return splitText.slice(1);
        }
    }

}

module.exports = {
    DiscordServer
};

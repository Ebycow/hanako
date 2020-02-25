const assert = require('assert').strict;
const discord = require('discord.js');
const { Commands } = require('../commands/commands');
const { CommandResult, ResultType } = require('../commands/commandresult');
const { MessageContext } = require('../contexts/messagecontext');
const { VoiceChat } = require('./voicechat');
const { AudioRequest } = require('./audiorequest');

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
        this.commandKey = process.env.PREFIX_KEY ? process.env.PREFIX_KEY : '>';

        /**
         * @type {discord.TextChannel}
         */
        this.mainChannel = null;

        /**
         * @type {VoiceChat}
         * @readonly
         */
        this.vc = new VoiceChat();

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
        this.commands = new Commands(guild.id);

        /** 
         * @type {boolean}
         * @readonly
         */
        this.isInitializing = false;
    }

    /**
     * @returns {Promise<void>}
     */
    async init() {
        this.isInitializing = true;
        try {
            await this.commands.init();
            this.isInitializing = false;
        } catch (err) {
            throw err;
        }
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
            return Promise.resolve(new CommandResult(ResultType.SUCCESS, null));
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
     * @param {discord.Message} message 
     */
    isMessageToReadOut(message) {
        return this.vc.isJoined && (this.mainChannel !== null) && (this.mainChannel.id === message.channel.id);
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
     * @param {MessageContext} context
     * @param {string} text
     * @returns {AudioRequest[]} 
     */
    createRequests(context, text) {
        const converters = this.commands.converters.sort((a, b) => {
            if (a.convertPriority() < b.convertPriority()) {
                return -1;
            } else if (a.convertPriority() > b.convertPriority()) {
                return 1;
            } else {
                return 0;
            }
        });

        return converters.reduce((acc, conv) => conv.convert(context, acc), [text]);
    }

    /**
     * @param {discord.Message} message
     * @returns {string[]}
     * @private 
     */
    _parseCommandArgument(message) {
        if (message.content.startsWith(this.commandKey)) {
            // ">teach 里見 あおもり" 形式のコマンド
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

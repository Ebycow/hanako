const path = require('path');
const logger = require('log4js').getLogger(path.basename(__filename));
const assert = require('assert').strict;
const discord = require('discord.js');
const { Commands } = require('../commands/commands');
const { CommandResult, ResultType } = require('../commands/commandresult');
const { MessageContext } = require('../contexts/messagecontext');
const { ActionContext } = require('../contexts/actioncontext');
const { VoiceChat } = require('./voicechat');
const { AudioRequest } = require('./audiorequest');
const { UserAction, ActionResult } = require('./useraction');
const { PagingAction, TeachPagingAction, SoundEffectPagingAction } = require('./useraction');

const CommandDelimiterRegexp = new RegExp('[ 　]+');

class DiscordServer {
    /**
     * @param {discord.Guild} guild
     */
    constructor(guild) {
        logger.trace('guild.id:', guild.id);
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
        await this.commands.init();
        this.isInitializing = false;
    }

    /**
     * @param {MessageContext} context
     * @param {discord.Message} message
     * @returns {Promise<CommandResult>}
     */
    handleMessage(context, message) {
        assert(this.isCommandMessage(message));

        const args = this._parseCommandArgument(message);
        logger.trace('handleMessage args:', args);
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
     * @returns {boolean}
     */
    isMessageToReadOut(message) {
        return this.vc.isJoined && this.mainChannel !== null && this.mainChannel.id === message.channel.id;
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
     * @param {ActionContext} context
     * @param {UserAction} action
     * @returns {Promise<ActionResult>}
     */
    handleAction(context, action) {
        const responsives = this.commands.responsives;

        for (const responsive of responsives) {
            if (responsive.canRespond(action)) {
                return Promise.resolve(responsive.respond(context, action));
            }
        }

        return Promise.reject('アクションに対応するResponsiveがない');
    }

    /**
     * @param {ActionContext} context
     * @param {discord.MessageReaction} reaction
     * @param {Buffer} emoji
     * @returns {Promise<ActionResult>}
     */
    async handleReaction(context, reaction, emoji) {
        const EMOJI_POINT_LEFT = new Uint8Array([0xf0, 0x9f, 0x91, 0x88]);
        const EMOJI_POINT_RIGHT = new Uint8Array([0xf0, 0x9f, 0x91, 0x89]);
        /**
         * @type {Map<string, PagingAction>}
         * @readonly
         */
        const pagerContents = new Map();
        pagerContents.set('se-list', SoundEffectPagingAction);
        pagerContents.set('dictionary', TeachPagingAction);

        const commandName = reaction.message.content.split('\n')[0].split(' ')[0];
        const page = parseInt(reaction.message.content.split('\n')[0].split(' ')[1], 10);

        const pagerActionClass = pagerContents.get(commandName);

        if (!pagerActionClass) {
            return Promise.reject('アクションに対応するpagerがない');
        }

        if (emoji.equals(EMOJI_POINT_LEFT)) {
            const result = await this.handleAction(context, new pagerActionClass(page - 1));
            return Promise.resolve(result);
        } else if (emoji.equals(EMOJI_POINT_RIGHT)) {
            const result = await this.handleAction(context, new pagerActionClass(page + 1));
            return Promise.resolve(result);
        }
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
    DiscordServer,
};

const path = require('path');
const logger = require('log4js').getLogger(path.basename(__filename));
const MessageBuilder = require('../service/message_builder');
const MessageService = require('../service/message_service');

/** @typedef {import('discord.js').Client} discord.Client */
/** @typedef {import('discord.js').Message} discord.Message */

class MessageCtrl {
    constructor() {
        // TODO Fix
    }

    /**
     * @param {discord.Message} message
     */
    async onMessage(message) {
        // TODO FIX
        const builder = new MessageBuilder(null, message, null);
        const dmessage = await builder.build({
            id: message.id,
            content: message.content,
            userId: message.author.id,
            userName: message.author.username,
            channelId: message.channel.id,
            channelName: message.channel.name,
            serverId: message.guild.id,
            serverName: message.guild.name,
            type: message.channel.type,
            isBot: message.author.bot,
            secret: typeof message.nonce === 'number' ? message.nonce >>> 0 : 0,
        });
        logger.info(dmessage);

        // TODO FIX これはモック
        const service = new MessageService();
        const tmp = await service.serve(dmessage);
        logger.info(tmp);
    }
}

module.exports = MessageCtrl;

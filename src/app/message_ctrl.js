const path = require('path');
const logger = require('log4js').getLogger(path.basename(__filename));
const MessageBuilder = require('../service/message_builder');
const MessageService = require('../service/message_service');

/** @typedef {import('discord.js').Client} discord.Client */
/** @typedef {import('discord.js').Message} discord.Message */

function handleUncaughtError(err) {
    if (err === 0) {
        // TODO FIX 中断エラー共通化
        return Promise.resolve();
    }

    // Note: ここまでエラーが来る === 未知のエラー
    logger.error('予期されないエラーが発生。', err);
    return Promise.resolve();
}

class MessageCtrl {
    /**
     * @param {discord.Client} client
     */
    constructor(client, servers) {
        this.client = client; // TODO 持ってないとだめ？
        this.servers = servers; // TODO FIX

        this.client.on('message', message => this.onMessage(message).catch(handleUncaughtError));
    }

    /**
     * @param {discord.Message} message
     */
    async onMessage(message) {
        const builder = new MessageBuilder(this.client, message, null);
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

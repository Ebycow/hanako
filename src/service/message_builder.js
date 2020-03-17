const path = require('path');
const logger = require('log4js').getLogger(path.basename(__filename));
const assert = require('assert').strict;
const emoji = require('node-emoji');
const { DiscordTagReplacer } = require('../utils/replacer');
const DiscordMessage = require('../domain/entities/discord_message');

/**
 * @typedef MessageBuilderData
 * @type {object}
 *
 * @property {string} id
 * @property {string} content
 * @property {string} userId
 * @property {string} userName
 * @property {string} channelId
 * @property {string} channelName
 * @property {string} serverId
 * @property {string} serverName
 * @property {'text'|'dm'} type
 * @property {boolean} isBot
 * @property {number} secret
 */

/**
 * アプリケーションサービス
 * DiscordMessageエンティティの構築
 */
class MessageBuilder {
    // TODO FIX こんなモノたちは受け取らない
    constructor(client, message, context) {
        // TODO FIX DI
        this.client = client;
        this.message = message;
        this.context = context;
        // TODO FIX こんなもの持たない
        this.commandKey = '!';
    }

    /**
     * DiscordMessageエンティティの構築
     * @param {Promise<MessageBuilderData>} obj
     * @param {Promise<DiscordMessage>}
     */
    async build(obj) {
        assert(typeof obj.id === 'string');
        assert(typeof obj.content === 'string');
        assert(typeof obj.userId === 'string');
        assert(typeof obj.userName === 'string');
        assert(typeof obj.channelId === 'string');
        assert(typeof obj.channelName === 'string');
        assert(typeof obj.serverId === 'string');
        assert(typeof obj.serverName === 'string');
        assert(obj.type === 'text' || obj.type === 'dm');
        assert(typeof obj.isBot === 'boolean');
        assert(typeof obj.secret === 'number' && Number.isInteger(obj.secret) && obj.secret >= 0);

        let data = Object.assign({}, obj);
        data = await processSecretF.call(this, data);
        data = await processValidateF.call(this, data);
        let type = await inferMessageTypeF.call(this, data);
        data = await processReplaceF.call(this, data);

        const dmessage = new DiscordMessage({
            id: data.id,
            content: data.content,
            type: type,
        });

        return Promise.resolve(dmessage);
    }
}

/**
 * @this {MessageBuilder}
 * @param {MessageBuilderData} data
 * @returns {Promise<MessageBuilderData>}
 */
async function processSecretF(data) {
    if (!(data.secret >>> 16 === 0xebeb)) {
        return Promise.resolve(data);
    }
    let content = data.content;
    let isBot = data.isBot;
    // TODO FIX
    if (data.userId === this.client.user.id) {
        // 命令が埋め込まれていた場合
        logger.info('インターナル命令を受信', data.secret.toString(16));
        const opcode = (data.secret & 0xffff) >>> 0;
        let tmp;
        switch (opcode) {
            case 1:
                // 復帰命令
                tmp = content.split(' ');
                tmp[1] = 'plz';
                content = tmp.slice(0, 2).join(' ');
                isBot = false;
                break;
            default:
                logger.error('未知のインターナル命令', data);
                // TODO FIX 中断エラーの共通化
                return Promise.reject(0);
        }
    }
    data.content = content;
    data.isBot = isBot;
    return Promise.resolve(data);
}

/**
 * @this {MessageBuilder}
 * @param {MessageBuilderData} data
 * @returns {Promise<MessageBuilderData>}
 */
async function processValidateF(data) {
    if (data.isBot || data.type !== 'text') {
        // BotとDMは無視
        logger.trace(`${data.userName}の${data.type}メッセージを無視`);
        // TODO FIX 中断エラーの共通化
        return Promise.reject(0);
    }
    return Promise.resolve(data);
}

/**
 * @this {MessageBuilder}
 * @param {MessageBuilderData} data
 * @returns {Promise<'command'|'read'>}
 */
async function inferMessageTypeF(data) {
    // TODO FIX
    if (this.message.mentions.has(this.client.user) || data.content.startsWith(this.commandKey)) {
        return Promise.resolve('command');
    }
    // TODO FIX もとは this.vc.isJoined && this.mainChannel !== null && this.mainChannel.id === message.channel.id
    if (this.message) {
        return Promise.resolve('read');
    }
}

/**
 * @this {MessageBuilder}
 * @param {MessageBuilderData} data
 * @returns {Promise<MessageBuilderData>}
 */
async function processReplaceF(data) {
    data.content = emoji.replace(data.content, emoji => `:${emoji.key}:`);
    // TODO FIX 境界に依存するDiscordTagReplacerはUtilではない
    data.content = DiscordTagReplacer.replace(this.context, data.content);
    return Promise.resolve(data);
}

module.exports = MessageBuilder;

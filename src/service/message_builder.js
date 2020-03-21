const path = require('path');
const logger = require('log4js').getLogger(path.basename(__filename));
const assert = require('assert').strict;
const errors = require('../core/errors').promises;
const DiscordMessage = require('../domain/entities/discord_message');

/** @typedef {import('../domain/models/discord_server')} DiscordServer */

/**
 * @typedef MessageBuilderData
 * @type {object}
 *
 * @property {string} id
 * @property {boolean} isHanakoMentioned
 * @property {string} content
 * @property {string} userId
 * @property {string} userName
 * @property {string} channelId
 * @property {string} channelName
 * @property {string} serverId
 * @property {string} serverName
 * @property {?string} voiceChannelId
 */

/**
 * アプリケーションサービス
 * DiscordMessageエンティティの構築
 */
class MessageBuilder {
    /**
     * DiscordMessageエンティティの構築
     *
     * @param {MessageBuilderData} param 構築に必要な情報
     * @param {DiscordServer} server 送信元サーバー
     * @returns {Promise<DiscordMessage>} 構築されたエンティティ
     */
    async build(param, server) {
        assert(typeof param.id === 'string');
        assert(typeof param.isHanakoMentioned === 'boolean');
        assert(typeof param.content === 'string');
        assert(typeof param.userId === 'string');
        assert(typeof param.userName === 'string');
        assert(typeof param.channelId === 'string');
        assert(typeof param.channelName === 'string');
        assert(typeof param.serverId === 'string');
        assert(typeof param.serverName === 'string');
        assert(typeof param.voiceChannelId === 'string' || param.voiceChannelId === null);
        assert(typeof server === 'object');

        let data = Object.assign({}, param);

        // コマンドか読み上げか無視かを判断する
        const type = await inferMessageTypeF.call(this, data, server);

        const dmessage = new DiscordMessage({
            id: data.id,
            content: data.content,
            type: type,
            serverId: data.serverId,
            channelId: data.channelId,
            voiceChannelId: data.voiceChannelId,
        });

        return Promise.resolve(dmessage);
    }
}

/**
 * (private) コマンドか読み上げか無視かを判断する。無視しないならタイプを返す。
 *
 * @this {MessageBuilder}
 * @param {MessageBuilderData} data
 * @param {DiscordServer} server
 * @returns {Promise<'command'|'read'>}
 */
async function inferMessageTypeF(data, server) {
    // 花子がメンションされているか、コマンドプリフィクスを持つならコマンド
    if (data.isHanakoMentioned || server.hasCommandPrefix(data.content)) {
        logger.trace(`command: ${data.serverName} #${data.channelName} [${data.userName}] ${data.content}`);
        return Promise.resolve('command');
    }
    // それ以外で、読み上げ対象のチャンネルなら読み上げ
    if (server.isReadingChannel(data.channelId)) {
        logger.trace(`read: ${data.serverName} #${data.channelName} [${data.userName}] ${data.content}`);
        return Promise.resolve('read');
    }
    // どちらでもなければ無視
    logger.trace(`pass: ${data.serverName} #${data.channelName} [${data.userName}] ${data.content}`);
    return errors.abort();
}

module.exports = MessageBuilder;

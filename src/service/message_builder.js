const path = require('path');
const logger = require('log4js').getLogger(path.basename(__filename));
const assert = require('assert').strict;
const errors = require('../core/errors').promises;
const DiscordMessage = require('../domain/entity/discord_message');

/** @typedef {import('../domain/model/hanako')} Hanako */

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
     * @param {Hanako} hanako 読み上げ花子モデル
     * @param {MessageBuilderData} param 構築に必要な情報
     * @returns {Promise<DiscordMessage>} 構築されたエンティティ
     */
    async build(hanako, param) {
        assert(typeof hanako === 'object');
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

        const data = Object.assign({}, param);

        // コマンドか読み上げか無視かを判断する
        const type = await inferMessageTypeF.call(this, hanako, data);

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
 * @param {Hanako} hanako
 * @param {MessageBuilderData} data
 * @returns {Promise<'command'|'read'>}
 */
async function inferMessageTypeF(hanako, data) {
    // 花子がメンションされているか、コマンドプリフィクスを持つなら暫定的にコマンド
    if (data.isHanakoMentioned || hanako.hasCommandPrefix(data.content)) {
        logger.trace(`command: ${data.serverName} #${data.channelName} [${data.userName}] ${data.content}`);
        return Promise.resolve('command');
    }
    // それ以外で、読み上げ対象のチャンネルなら読み上げ
    if (hanako.isReadingChannel(data.channelId)) {
        logger.trace(`read: ${data.serverName} #${data.channelName} [${data.userName}] ${data.content}`);
        return Promise.resolve('read');
    }
    // どちらでもなければ無視
    logger.trace(`pass: ${data.serverName} #${data.channelName} [${data.userName}] ${data.content}`);
    return errors.abort();
}

module.exports = MessageBuilder;

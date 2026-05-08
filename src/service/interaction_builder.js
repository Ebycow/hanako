const assert = require('assert').strict;
const DiscordMessage = require('../domain/entity/discord_message');

/** @typedef {import('../domain/model/hanako')} Hanako */

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
 * @property {?string} voiceChannelId
 * @property {Map<string, string>} mentionedUsers
 */

/**
 * アプリケーションサービス
 * DiscordMessageエンティティの構築
 */
class InteractionBuilder {
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
        assert(typeof param.content === 'string');
        assert(typeof param.userId === 'string');
        assert(typeof param.userName === 'string');
        assert(typeof param.channelId === 'string');
        assert(typeof param.channelName === 'string');
        assert(typeof param.serverId === 'string');
        assert(typeof param.serverName === 'string');
        assert(typeof param.voiceChannelId === 'string' || param.voiceChannelId === null);
        assert(typeof param.mentionedUsers === 'object');

        const data = Object.assign({}, param);

        const dmessage = new DiscordMessage({
            id: data.id,
            content: data.content,
            type: 'interaction',
            serverId: data.serverId,
            channelId: data.channelId,
            userId: data.userId,
            voiceChannelId: data.voiceChannelId,
            mentionedUsers: data.mentionedUsers,
        });

        return Promise.resolve(dmessage);
    }
}

module.exports = InteractionBuilder;

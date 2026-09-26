const assert = require('assert').strict;
const DiscordMessage = require('../domain/entity/discord_message');

/** @typedef {import('../domain/model/hanako')} Hanako */

/**
 * @typedef InteractionBuilderData
 * @type {object}
 *
 * @property {string} id
 * @property {string} commandName スラッシュコマンド名
 * @property {object} commandArgs オプションから作った名前付きの引数
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
class InteractionBuilder {
    /**
     * DiscordMessageエンティティの構築
     *
     * @param {Hanako} hanako 読み上げ花子モデル
     * @param {InteractionBuilderData} param 構築に必要な情報
     * @returns {Promise<DiscordMessage>} 構築されたエンティティ
     */
    async build(hanako, param) {
        assert(typeof hanako === 'object');
        assert(typeof param.id === 'string');
        assert(typeof param.commandName === 'string');
        assert(typeof param.commandArgs === 'object');
        assert(typeof param.userId === 'string');
        assert(typeof param.userName === 'string');
        assert(typeof param.channelId === 'string');
        assert(typeof param.channelName === 'string');
        assert(typeof param.serverId === 'string');
        assert(typeof param.serverName === 'string');
        assert(typeof param.voiceChannelId === 'string' || param.voiceChannelId === null);

        const data = Object.assign({}, param);

        const dmessage = new DiscordMessage({
            id: data.id,
            content: data.commandName,
            type: 'interaction',
            serverId: data.serverId,
            channelId: data.channelId,
            userId: data.userId,
            voiceChannelId: data.voiceChannelId,
            mentionedUsers: new Map(),
            commandArgs: data.commandArgs,
        });

        return Promise.resolve(dmessage);
    }
}

module.exports = InteractionBuilder;

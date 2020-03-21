const path = require('path');
const logger = require('log4js').getLogger(path.basename(__filename));
const assert = require('assert').strict;
const errors = require('../core/errors').promises;
const Injector = require('../core/injector');
const IDiscordServerRepo = require('../domain/repos/i_discord_server_repo');
const DiscordMessage = require('../domain/entities/discord_message');

/**
 * @typedef MessageBuilderData
 * @type {object}
 *
 * @property {string} id
 * @property {boolean} isHanako
 * @property {boolean} isHanakoMentioned
 * @property {string} content
 * @property {string} userId
 * @property {string} userName
 * @property {string} channelId
 * @property {string} channelName
 * @property {string} serverId
 * @property {string} serverName
 * @property {?string} voiceChannelId
 * @property {number} secret
 */

/**
 * アプリケーションサービス
 * DiscordMessageエンティティの構築
 */
class MessageBuilder {
    /**
     * @param {null} serverRepo
     */
    constructor(serverRepo = null) {
        this.serverRepo = serverRepo || Injector.resolve(IDiscordServerRepo);
    }

    /**
     * DiscordMessageエンティティの構築
     *
     * @param {MessageBuilderData} param 構築に必要な情報
     * @returns {Promise<DiscordMessage>} 構築されたエンティティ
     */
    async build(param) {
        assert(typeof param.id === 'string');
        assert(typeof param.isHanako === 'boolean');
        assert(typeof param.isHanakoMentioned === 'boolean');
        assert(typeof param.content === 'string');
        assert(typeof param.userId === 'string');
        assert(typeof param.userName === 'string');
        assert(typeof param.channelId === 'string');
        assert(typeof param.channelName === 'string');
        assert(typeof param.serverId === 'string');
        assert(typeof param.serverName === 'string');
        assert(typeof param.voiceChannelId === 'string' || param.voiceChannelId === null);
        assert(typeof param.secret === 'number' && Number.isInteger(param.secret) && param.secret >= 0);

        let data = Object.assign({}, param);
        data = await processSecretF.call(this, data);

        const server = await this.serverRepo.load(data.serverId);
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
 * (private) インターナル命令を処理
 *
 * @this {MessageBuilder}
 * @param {MessageBuilderData} data
 * @returns {Promise<MessageBuilderData>}
 */
async function processSecretF(data) {
    if (data.isHanako) {
        if (data.secret >>> 16 === 0xebeb) {
            // インターナル命令が埋め込まれていた場合
            logger.info('インターナル命令を受信', data.secret.toString(16));
            const opcode = (data.secret & 0xffff) >>> 0;
            let content = data.content;
            let tmp;
            switch (opcode) {
                case 0x0001:
                    // 復帰命令
                    tmp = content.split(' ');
                    tmp[1] = 'plz';
                    content = tmp.slice(0, 2).join(' ');
                    break;
                default:
                    // TODO ここでlogger.errorは何かがおかしい
                    logger.error('未知のインターナル命令', data);
                    return errors.abort();
            }
            data.content = content;
        } else {
            // インターナル命令じゃない花子は常に無視
            logger.trace(`pass-self: ${data.serverName} #${data.channelName} [${data.userName}] ${data.content}`);
            return errors.abort();
        }
    }
    return Promise.resolve(data);
}

/**
 * (private) コマンドか読み上げか無視かを判断する。無視しないならタイプを返す。
 *
 * @this {MessageBuilder}
 * @param {MessageBuilderData} data
 * @param {import('../domain/models/discord_server')} server
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

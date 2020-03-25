const path = require('path');
const logger = require('log4js').getLogger(path.basename(__filename));
const assert = require('assert').strict;
const discord = require('discord.js');
const errors = require('../../core/errors').promises;
const Injector = require('../../core/injector');
const IDiscordChatRepo = require('../../domain/repos/i_discord_chat_repo');

// unused
logger;

/**
 * ディスコートメッセージ送信マネージャ
 *
 * @implements {IDiscordChatRepo}
 */
class DiscordSendMessageManager {
    /**
     * DIコンテナ用コンストラクタ
     * 初回呼び出し時にはモジュール初期化を行う
     *
     * @param {null} client DI
     */
    constructor(client = null) {
        this.client = client || Injector.resolveSingleton(discord.Client);
    }

    /**
     * (impl) IDiscordChatRepo
     *
     * @param {ChatResponse} chat
     * @returns {Promise<void>}
     */
    async postChat(chat) {
        assert(typeof chat === 'object');

        const channel = this.client.channels.resolve(chat.channelId);
        if (!channel) {
            return errors.unexpected(`no-such-channel ${chat}`);
        }
        if (!(channel instanceof discord.TextChannel)) {
            return errors.unexpected(`not-a-text-channel ${chat}`);
        }

        const sent = await channel.send(chat.content);

        switch (chat.code) {
            case 'pager':
                await sent.react('👈');
                await sent.react('👉');
                break;
            default:
            // pass
        }

        return Promise.resolve();
    }
}

// IDiscordChatRepoの実装として登録
IDiscordChatRepo.comprise(DiscordSendMessageManager);

module.exports = DiscordSendMessageManager;

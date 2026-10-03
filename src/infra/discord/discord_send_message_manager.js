const path = require('path');
const logger = require('log4js').getLogger(path.basename(__filename));
const assert = require('assert').strict;
const discord = require('discord.js');
const errors = require('../../core/errors').promises;
const IDiscordChatRepo = require('../../domain/repo/i_discord_chat_repo');
const { missingBotPermissions, describeMissingPermissions } = require('./bot_permissions');

const { ChannelType, PermissionFlagsBits } = require('discord.js');

// unused
logger;

/** @typedef {import('../../domain/entity/responses/chat_response')} ChatResponse */

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
     * @param {discord.Client} client DI
     */
    constructor(client) {
        this.client = client;
    }

    /**
     * (impl) IDiscordChatRepo
     *
     * @param {ChatResponse} chat
     * @param interaction
     * @returns {Promise<void>}
     */
    async postChat(chat) {
        assert(typeof chat === 'object');

        // テキストチャネルの実体を取得
        const channel = this.client.channels.resolve(chat.channelId);
        if (!channel || (channel.type !== ChannelType.GuildText && channel.type !== ChannelType.GuildVoice)) {
            return errors.unexpected(`no-such-text-channel ${chat}`);
        }

        // 花子自身の権限を確認（送れない場合はスラッシュコマンドなら実行者にだけ理由が伝わる）
        const missing = missingBotPermissions(channel, [
            PermissionFlagsBits.ViewChannel,
            PermissionFlagsBits.SendMessages,
        ]);
        if (missing.length > 0) {
            const message = describeMissingPermissions(channel, missing);
            return errors.disappointed(`missing-text-permissions ${chat}`, message);
        }

        const sent = await channel.send(chat.content);

        if (chat.code === 'pager') {
            await sent.react('👈');
            await sent.react('👉');
        }

        return Promise.resolve();
    }
}

// IDiscordChatRepoの実装として登録
IDiscordChatRepo.comprise(DiscordSendMessageManager, [discord.Client]);

module.exports = DiscordSendMessageManager;

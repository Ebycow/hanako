const path = require('path');
const logger = require('log4js').getLogger(path.basename(__filename));
const MessageValidator = require('../service/message_validator');
const HanakoLoader = require('../service/hanako_loader');

/** @typedef {import('discord.js').Client} discord.Client */
/** @typedef {import('discord.js').Message} discord.Message */

/**
 * Statusコントローラ
 * - ボットステータスの変更を処理する
 * - Messageイベントを受け取る
 */
class StatusChangeCtrl {
    /**
     * @param {discord.Client} client Discord Botのクライアント
     */
    constructor(client) {
        this.client = client;
        this.validator = new MessageValidator();
        this.hanakoLoader = new HanakoLoader();
        this.readCount = 0;
        logger.trace('セットアップ完了');
    }

    /**
     * Discordから受信したメッセージを包括的に処理
     *
     * @param {discord.Message} message 受信したDiscordのメッセージ
     * @param {string} content 標準化済みメッセージ内容
     */
    async onStatusChange(message, content) {
        const hanako = await this.hanakoLoader.load(message.guild.id);
        const prefix = hanako.prefix;

        // バリデーション
        const validatorParam = {
            isBot: message.author.bot,
            content,
            userName: message.author.username,
            channelType: message.channel.type,
        };
        await this.validator.validate(validatorParam);
        this.readCount++;
        this.client.user.setActivity(`${prefix}help | ${this.readCount}回読んだ！`);
    }
}

module.exports = StatusChangeCtrl;

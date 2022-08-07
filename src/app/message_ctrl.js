const path = require('path');
const logger = require('log4js').getLogger(path.basename(__filename));
const MessageValidator = require('../service/message_validator');
const MessageBuilder = require('../service/message_builder');
const MessageService = require('../service/message_service');
const ResponseHandler = require('../service/response_handler');
const HanakoLoader = require('../service/hanako_loader');

/** @typedef {import('discord.js').Client} discord.Client */
/** @typedef {import('discord.js').Message} discord.Message */

/**
 * Messageコントローラ
 * - Discordから受信したメッセージを包括的に対応する
 * - messageイベントを受け取る
 */
class MessageCtrl {
    /**
     * @param {discord.Client} client Discord Botのクライアント
     */
    constructor(client) {
        this.client = client;
        this.validator = new MessageValidator();
        this.builder = new MessageBuilder();
        this.service = new MessageService();
        this.responseHandler = new ResponseHandler();
        this.hanakoLoader = new HanakoLoader();

        logger.trace('セットアップ完了');
    }

    /**
     * Discordから受信したメッセージを包括的に処理
     *
     * @param {discord.Message} message 受信したDiscordのメッセージ
     * @param {string} content 標準化済みメッセージ内容
     */
    async onMessage(message, content) {
        console.log(message.stickers.size);

        // バリデーション
        const validatorParam = {
            isBot: message.author.bot,
            content,
            userName: message.author.username,
            channelType: message.channel.type,
        };
        await this.validator.validate(validatorParam);

        // 読み上げ花子モデルを取得
        const hanako = await this.hanakoLoader.load(message.guild.id);

        // メッセージエンティティの作成
        const builderParam = {
            id: message.id,
            content,
            userId: message.author.id,
            userName: message.author.username,
            channelId: message.channel.id,
            channelName: message.channel.name,
            serverId: message.guild.id,
            serverName: message.guild.name,
            voiceChannelId: message.member.voice.channel ? message.member.voice.channel.id : null,
            mentionedUsers: message.mentions.members.reduce((map, m) => map.set(m.displayName, m.id), new Map()),
        };
        const entity = await this.builder.build(hanako, builderParam);

        // メッセージに対する花子のレスポンスを取得
        const response = await this.service.serve(hanako, entity);

        // レスポンスハンドラにレスポンス処理をさせて終了
        await this.responseHandler.handle(response);
    }
}

module.exports = MessageCtrl;

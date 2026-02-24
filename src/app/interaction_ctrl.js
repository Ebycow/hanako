const path = require('path');
const logger = require('log4js').getLogger(path.basename(__filename));
const InteractionBuilder = require('../service/interaction_builder');
const MessageService = require('../service/message_service');
const ResponseHandler = require('../service/response_handler');
const HanakoLoader = require('../service/hanako_loader');

/** @typedef {import('discord.js').Client} discord.Client */
/** @typedef {import('discord.js').Interaction} discord.Interaction */

/**
 * Commandコントローラ
 * - Discordから受信したインタラクションを包括的に対応する
 * - interactionCreateイベントを受け取る
 */
class InteractionCtrl {
    /**
     * @param {discord.Client} client Discord Botのクライアント
     */
    constructor(client) {
        this.client = client;
        this.builder = new InteractionBuilder();
        this.service = new MessageService();
        this.responseHandler = new ResponseHandler();
        this.hanakoLoader = new HanakoLoader();

        logger.trace('セットアップ完了');
    }

    /**
     * Discordから受信したインタラクションを包括的に処理
     *
     * @param {discord.Interaction} interaction 受信したDiscordのメッセージ
     */
    async onInteraction(interaction) {
        // バリデーション
        // なし

        // 読み上げ花子モデルを取得
        const hanako = await this.hanakoLoader.load(interaction.guild.id);

        // スラッシュコマンドのオプションを処理
        let content = hanako.prefix + interaction.commandName;
        const options = interaction.options.data;
        const mentionedUsers = new Map();
        if (options.length > 0) {
            const args = options.map(option => {
                if (option.type === 6) {
                    // USER
                    const username = option.user.username;
                    const userId = option.value;
                    mentionedUsers.set(username, userId);
                    return '@' + username;
                }
                return option.value;
            });
            content += ' ' + args.join(' ');
        }

        // メッセージエンティティの作成
        const builderParam = {
            id: interaction.id,
            content,
            userId: interaction.user.id,
            userName: interaction.user.username,
            channelId: interaction.channel.id,
            channelName: interaction.channel.name,
            serverId: interaction.guildId,
            serverName: interaction.guild.name,
            voiceChannelId: interaction.member.voice.channel ? interaction.member.voice.channel.id : null,
            mentionedUsers,
        };
        const entity = await this.builder.build(hanako, builderParam);

        // メッセージに対する花子のレスポンスを取得
        const response = await this.service.serve(hanako, entity);

        // リプライ必須なので握りつぶす
        try {
            // レスポンスハンドラにレスポンス処理をさせて終了
            await this.responseHandler.handle(response);
            await interaction.reply('コマンドを実行しました！😸', { ephemeral: true });
            await interaction.deleteReply({ timeout: 3000 });
        } catch (error) {
            await interaction.reply('コマンドの実行に失敗しました･･･😿', { ephemeral: true });
            await interaction.deleteReply({ timeout: 3000 });
        }
    }
}

module.exports = InteractionCtrl;

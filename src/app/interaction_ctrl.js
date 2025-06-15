const path = require('path');
const logger = require('log4js').getLogger(path.basename(__filename));
const InteractionBuilder = require('../service/interaction_builder');
const MessageService = require('../service/message_service');
const ResponseHandler = require('../service/response_handler');
const HanakoLoader = require('../service/hanako_loader');

/**
 * (private) SlashCommand optionを平坦化して引数文字列の配列を生成
 *
 * @param {import('discord.js').CommandInteractionOption} option
 * @returns {string[]}
 */
function flattenOptions(option) {
    if (option.type === 1 || option.type === 2) {
        // SUB_COMMAND or SUB_COMMAND_GROUP
        const nested = option.options ? option.options.flatMap(o => flattenOptions(o)) : [];
        return [option.name, ...nested];
    }
    return option.value !== undefined ? [String(option.value)] : [];
}

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
        // ChatInput以外のインタラクションは無視
        if (!interaction.isChatInputCommand()) {
            return;
        }

        // 読み上げ花子モデルを取得
        const hanako = await this.hanakoLoader.load(interaction.guild.id);

        // メッセージエンティティの作成
        const args = interaction.options.data.flatMap(option => flattenOptions(option));
        const content = `${hanako.prefix}${interaction.commandName}${args.length ? ' ' + args.join(' ') : ''}`;

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
            mentionedUsers: new Map(), // 空なので一応空宣言
        };
        const entity = await this.builder.build(hanako, builderParam);

        // メッセージに対する花子のレスポンスを取得
        const response = await this.service.serve(hanako, entity);

        // リプライ必須なので握りつぶす
        try {
            // レスポンスハンドラにレスポンス処理をさせて終了
            await this.responseHandler.handle(response);
            await interaction.reply('コマンドを実行しました！😸', { ephemeral: true });
            setTimeout(() => interaction.deleteReply(), 3000);
        } catch (error) {
            await interaction.reply('コマンドの実行に失敗しました･･･😿', { ephemeral: true });
            setTimeout(() => interaction.deleteReply(), 3000);
        }
    }
}

module.exports = InteractionCtrl;

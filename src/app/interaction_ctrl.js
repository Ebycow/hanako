const path = require('path');
const logger = require('log4js').getLogger(path.basename(__filename));
const InteractionBuilder = require('../service/interaction_builder');
const MessageService = require('../service/message_service');
const InteractionResponder = require('../service/interaction_responder');
const HanakoLoader = require('../service/hanako_loader');
const Commando = require('../domain/model/commando');
const errors = require('../core/errors').promises;
const sanitizeContent = require('../core/utils/sanitize_content');
const { ApplicationCommandOptionType, MessageFlags } = require('discord.js');

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
        this.responder = new InteractionResponder();
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
        // ボタン等もこのイベントに届くが、このコントローラが扱うのはスラッシュコマンドだけ（ページ送りボタンは PagerButtonCtrl）
        if (!interaction.isChatInputCommand()) {
            logger.trace(`スラッシュコマンド以外のインタラクションなので無視した (type: ${interaction.type})`);
            return errors.abort();
        }
        // コマンドはサーバー内でのみ使えるよう登録しているが、念のためDM等からの実行を弾く
        if (!interaction.inCachedGuild()) {
            await interaction.reply({
                content: 'はなこのコマンドはサーバーの中で使ってね！',
                flags: MessageFlags.Ephemeral,
            });
            return;
        }

        // 一覧や検索など本人が見たいだけのコマンドは、結果を実行者にだけ見せる
        const K = Commando.findSlashCommand(interaction.commandName);
        const ephemeral = Boolean(K && K.slash.ephemeral);

        // 3秒以内に応答しないとインタラクションが失効するため、先に「考え中」の応答を返しておく
        // Note: 公開範囲は保留した時点で決まり、後から変えられない
        await interaction.deferReply(ephemeral ? { flags: MessageFlags.Ephemeral } : {});

        try {
            const response = await processInteractionF.call(this, interaction);
            await this.responder.respond(interaction, response, ephemeral);
        } catch (error) {
            await this.responder
                .replyFailure(interaction, error, ephemeral)
                .catch((e) => logger.warn('インタラクションの応答に失敗', e));
            throw error;
        }
    }
}

/**
 * (private) スラッシュコマンドを実行してレスポンスを得る
 *
 * @this {InteractionCtrl}
 * @param {discord.ChatInputCommandInteraction} interaction 受信したスラッシュコマンド
 * @returns {Promise<import('../domain/entity/responses').ResponseT>} コマンドのレスポンス
 */
async function processInteractionF(interaction) {
    // 読み上げ花子モデルを取得
    const hanako = await this.hanakoLoader.load(interaction.guild.id);

    // スラッシュコマンドのオプションを名前付きの引数にする
    const commandArgs = buildCommandArgsF(interaction);

    // メッセージエンティティの作成
    const builderParam = {
        id: interaction.id,
        commandName: interaction.commandName,
        commandArgs,
        userId: interaction.user.id,
        userName: interaction.user.username,
        channelId: interaction.channel.id,
        channelName: interaction.channel.name,
        serverId: interaction.guildId,
        serverName: interaction.guild.name,
        voiceChannelId: interaction.member.voice.channel ? interaction.member.voice.channel.id : null,
    };
    const entity = await this.builder.build(hanako, builderParam);

    // メッセージに対する花子のレスポンスを取得
    // Note: 実行者と実行内容は、公開の返信にDiscordが「○○が /コマンド を使用しました」と表示する
    return this.service.serve(hanako, entity);
}

/**
 * (private) スラッシュコマンドのオプションを名前付きの引数にする
 * - 文字列はテキスト投稿と同じ標準化をかける
 * - ユーザーは {id, name}、添付ファイルは attachments 配列にまとめる
 *
 * @param {discord.ChatInputCommandInteraction} interaction 受信したスラッシュコマンド
 * @returns {object} 名前付きの引数
 */
function buildCommandArgsF(interaction) {
    const guild = interaction.guild;
    const resolvers = {
        user: (id) => nameOfF(guild.members.cache.get(id), 'displayName'),
        role: (id) => nameOfF(guild.roles.cache.get(id), 'name'),
        channel: (id) => nameOfF(guild.channels.cache.get(id), 'name'),
    };

    const args = {};
    for (const option of interaction.options.data) {
        switch (option.type) {
            case ApplicationCommandOptionType.String:
                args[option.name] = sanitizeContent(option.value, resolvers);
                break;
            case ApplicationCommandOptionType.User:
                args[option.name] = {
                    id: option.value,
                    name: option.member ? option.member.displayName : option.user.username,
                };
                break;
            case ApplicationCommandOptionType.Attachment:
                args.attachments = (args.attachments || []).concat({
                    name: option.attachment.title || option.attachment.name,
                    url: option.attachment.url,
                });
                break;
            default:
                args[option.name] = option.value;
        }
    }
    return args;
}

function nameOfF(entity, key) {
    return entity ? entity[key] : undefined;
}

module.exports = InteractionCtrl;

const path = require('path');
const logger = require('log4js').getLogger(path.basename(__filename));
const InteractionBuilder = require('../service/interaction_builder');
const MessageService = require('../service/message_service');
const ResponseHandler = require('../service/response_handler');
const HanakoLoader = require('../service/hanako_loader');
const ChatResponse = require('../domain/entity/responses/chat_response');
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
        // ボタン・オートコンプリート等もこのイベントに届くが、花子が扱うのはスラッシュコマンドだけ
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

        // 3秒以内に応答しないとインタラクションが失効するため、先に「考え中」の応答を返しておく
        await interaction.deferReply({ flags: MessageFlags.Ephemeral });

        let result = 'コマンドを実行しました！😸';
        try {
            const succeeded = await processInteractionF.call(this, interaction);
            if (!succeeded) {
                // アクションの失敗理由は onFailure としてチャンネルに投稿済み
                result = 'コマンドの実行に失敗しました･･･😿\n理由はチャンネルへの投稿を見てね';
            }
        } catch (error) {
            result = 'コマンドの実行に失敗しました･･･😿';
            if (error.eby && error.type === 'disappointed' && error.explained) {
                // 権限不足など利用者に伝えるべき理由があるときは、実行者にだけ見える応答で伝える
                result += '\n' + error.message;
            }
            throw error;
        } finally {
            await interaction.editReply(result).catch((e) => logger.warn('インタラクションの応答に失敗', e));
            setTimeout(() => interaction.deleteReply().catch(() => {}), 3000);
        }
    }
}

/**
 * (private) スラッシュコマンドを実行する
 *
 * @this {InteractionCtrl}
 * @param {discord.ChatInputCommandInteraction} interaction 受信したスラッシュコマンド
 * @returns {Promise<boolean>} アクションが失敗したときは false
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
    // 実行者と実行内容がチャンネルで分かるように、先に実行ログを投稿する
    const executionLog = new ChatResponse({
        id: interaction.id,
        content: `${interaction.user.username}が「${describeInteractionF(interaction)}」を実行したよ！`,
        channelId: interaction.channel.id,
        code: 'simple',
    });
    try {
        await this.responseHandler.handle(executionLog);
    } catch (error) {
        logger.warn(`スラッシュコマンド実行ログの投稿に失敗しました (interaction: ${interaction.id})`, error);
    }

    const response = await this.service.serve(hanako, entity);

    // レスポンスハンドラにレスポンス処理をさせて終了
    const succeeded = await this.responseHandler.handle(response);
    return succeeded !== false;
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

/**
 * (private) 実行ログ用にスラッシュコマンドを表記する 例: /teach from:花子 to:はなこ
 *
 * @param {discord.ChatInputCommandInteraction} interaction 受信したスラッシュコマンド
 * @returns {string}
 */
function describeInteractionF(interaction) {
    const options = interaction.options.data.map((option) => {
        if (option.type === ApplicationCommandOptionType.User) {
            return `${option.name}:@${option.member ? option.member.displayName : option.user.username}`;
        }
        if (option.type === ApplicationCommandOptionType.Attachment) {
            return `${option.name}:${option.attachment.name}`;
        }
        return `${option.name}:${option.value}`;
    });
    return ['/' + interaction.commandName, ...options].join(' ');
}

module.exports = InteractionCtrl;

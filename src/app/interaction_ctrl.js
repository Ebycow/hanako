const path = require('path');
const logger = require('log4js').getLogger(path.basename(__filename));
const InteractionBuilder = require('../service/interaction_builder');
const MessageService = require('../service/message_service');
const ResponseHandler = require('../service/response_handler');
const HanakoLoader = require('../service/hanako_loader');
const ChatResponse = require('../domain/entity/responses/chat_response');
const errors = require('../core/errors').promises;
const { MessageFlags } = require('discord.js');

/** @typedef {import('discord.js').Client} discord.Client */
/** @typedef {import('discord.js').Interaction} discord.Interaction */

const SLASH_COMMAND_ALIASES = Object.freeze({
    'se-search': 'se?',
});

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
            await processInteractionF.call(this, interaction);
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
 * @returns {Promise<void>}
 */
async function processInteractionF(interaction) {
    // 読み上げ花子モデルを取得
    const hanako = await this.hanakoLoader.load(interaction.guild.id);

    // スラッシュコマンドのオプションを処理
    const { content, mentionedUsers } = buildInteractionCommandContentF(hanako.prefix, interaction);

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
    // 実行者と実行内容がチャンネルで分かるように、先に実行ログを投稿する
    const executionLog = new ChatResponse({
        id: interaction.id,
        content: `${interaction.user.username}が「${content}」を実行したよ！`,
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
    await this.responseHandler.handle(response);
}

function resolveTextCommandNameF(slashCommandName) {
    return SLASH_COMMAND_ALIASES[slashCommandName] || slashCommandName;
}

function buildInteractionCommandContentF(prefix, interaction) {
    const textCommandName = resolveTextCommandNameF(interaction.commandName);
    let content = prefix + textCommandName;
    const mentionedUsers = new Map();

    const options = interaction.options && Array.isArray(interaction.options.data) ? interaction.options.data : [];
    if (options.length === 0) {
        return { content, mentionedUsers };
    }

    const args = options
        .map((option) => {
            if (option.type === 6) {
                // USER option
                const username = option.user ? option.user.username : `${option.value}`;
                mentionedUsers.set(username, option.value);
                return '@' + username;
            }
            if (option.value === undefined || option.value === null) {
                return null;
            }
            return `${option.value}`;
        })
        .filter((value) => value !== null);

    if (args.length > 0) {
        content += ' ' + args.join(' ');
    }

    return { content, mentionedUsers };
}

module.exports = InteractionCtrl;

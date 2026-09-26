const path = require('path');
const logger = require('log4js').getLogger(path.basename(__filename));
const InteractionBuilder = require('../service/interaction_builder');
const MessageService = require('../service/message_service');
const InteractionResponder = require('../service/interaction_responder');
const HanakoLoader = require('../service/hanako_loader');
const { parseConfirmButton } = require('../service/confirm_buttons');
const errors = require('../core/errors').promises;

/** @typedef {import('discord.js').Client} discord.Client */
/** @typedef {import('discord.js').Interaction} discord.Interaction */

/**
 * ConfirmButtonコントローラ
 * - 破壊的なスラッシュコマンドの確認ボタンを処理する
 * - interactionCreateイベントを受け取る
 *
 * 確認ボタンは実行者にだけ見える返信に付けているため、押せるのは実行者本人だけ
 */
class ConfirmButtonCtrl {
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
     * 確認ボタンの押下を処理
     * - 確認ボタン以外のインタラクションのとき errors.abort
     *
     * @param {discord.Interaction} interaction 受信したインタラクション
     */
    async onConfirmButton(interaction) {
        const button = interaction.isButton() ? parseConfirmButton(interaction.customId) : null;
        if (!button || !interaction.inCachedGuild()) {
            return errors.abort();
        }

        if (!button.confirmed) {
            await interaction.update({ content: 'やめておきました', components: [] });
            return;
        }

        // 3秒以内に応答しないとインタラクションが失効するため、先に更新を保留しておく
        await interaction.deferUpdate();

        const target = InteractionResponder.confirmedReplyTarget(interaction, button.commandName);
        try {
            const response = await processConfirmedF.call(this, interaction, button.commandName);
            await this.responder.respond(target, response);
        } catch (error) {
            await this.responder
                .replyFailure(target, error)
                .catch((e) => logger.warn('インタラクションの応答に失敗', e));
            throw error;
        }
    }
}

/**
 * (private) 確定したスラッシュコマンドを実行してレスポンスを得る
 *
 * @this {ConfirmButtonCtrl}
 * @param {import('discord.js').ButtonInteraction} interaction 押された確認ボタン
 * @param {string} commandName 確定したスラッシュコマンド名
 * @returns {Promise<import('../domain/entity/responses').ResponseT>} コマンドのレスポンス
 */
async function processConfirmedF(interaction, commandName) {
    // 読み上げ花子モデルを取得
    const hanako = await this.hanakoLoader.load(interaction.guild.id);

    // 確定済みとしてスラッシュコマンドのメッセージエンティティを作成
    const builderParam = {
        id: interaction.id,
        commandName,
        commandArgs: { force: true },
        userId: interaction.user.id,
        userName: interaction.user.username,
        channelId: interaction.channel.id,
        channelName: interaction.channel.name,
        serverId: interaction.guildId,
        serverName: interaction.guild.name,
        voiceChannelId: interaction.member.voice.channel ? interaction.member.voice.channel.id : null,
    };
    const entity = await this.builder.build(hanako, builderParam);

    return this.service.serve(hanako, entity);
}

module.exports = ConfirmButtonCtrl;

const path = require('path');
const logger = require('log4js').getLogger(path.basename(__filename));
const assert = require('assert').strict;
const { MessageFlags } = require('discord.js');
const ActionHandler = require('../domain/service/action_handler');

/** @typedef {import('discord.js').ChatInputCommandInteraction} discord.ChatInputCommandInteraction */
/** @typedef {import('../domain/entity/responses').ResponseT} ResponseT */
/** @typedef {import('../domain/entity/responses/chat_response')} ChatResponse */

const DONE_MESSAGE = 'コマンドを実行しました！😸';
const FAILED_MESSAGE = 'コマンドの実行に失敗しました･･･😿';

/**
 * アプリケーションサービス
 * スラッシュコマンドへのレスポンスを、チャンネルへの投稿ではなくインタラクションへの返信として返す
 *
 * - 応答は処理の前に deferReply で保留してある前提
 * - 保留したときの公開範囲（公開 / 実行者のみ）は後から変えられないため、呼び出し側から受け取る
 * - エラーは公開で保留していても実行者にだけ見せる
 */
class InteractionResponder {
    /**
     * @param {null} actionHandler DomainService
     */
    constructor(actionHandler = null) {
        this.actionHandler = actionHandler || new ActionHandler();
    }

    /**
     * レスポンスをインタラクションへの返信として返す
     * - アクションが説明なしで失敗したときは例外をそのまま投げる（ResponseHandlerと同じ）
     *
     * @param {discord.ChatInputCommandInteraction} interaction 応答を保留済みのインタラクション
     * @param {ResponseT} response コマンドのレスポンス
     * @param {boolean} ephemeral 実行者にだけ見える形で保留したか
     * @returns {Promise<boolean>} エラーを返したときは false
     */
    async respond(interaction, response, ephemeral) {
        assert(typeof interaction === 'object');
        assert(typeof response === 'object');
        assert(typeof ephemeral === 'boolean');

        if (response.type === 'chat') {
            return replyChatF.call(this, interaction, response, ephemeral);
        } else if (response.type === 'action') {
            return respondActionF.call(this, interaction, response, ephemeral);
        } else if (response.type === 'silent') {
            await interaction.editReply(DONE_MESSAGE);
            return true;
        } else {
            throw new Error(`スラッシュコマンドに返せないレスポンス ${response}`);
        }
    }

    /**
     * エラーを実行者にだけ見える形で返す
     * - 公開で保留していたときは、公開の保留を取り消してから実行者だけに見える返信を送る
     *
     * @param {discord.ChatInputCommandInteraction} interaction 応答を保留済みのインタラクション
     * @param {string} content エラー内容
     * @param {boolean} ephemeral 実行者にだけ見える形で保留したか
     * @returns {Promise<void>}
     */
    async replyError(interaction, content, ephemeral) {
        if (ephemeral) {
            await interaction.editReply(content);
            return;
        }
        await interaction.deleteReply().catch((e) => logger.warn('保留した応答の取り消しに失敗', e));
        await interaction.followUp({ content, flags: MessageFlags.Ephemeral });
    }

    /**
     * 想定外の失敗を実行者に伝える
     *
     * @param {discord.ChatInputCommandInteraction} interaction 応答を保留済みのインタラクション
     * @param {Error} error 発生したエラー
     * @param {boolean} ephemeral 実行者にだけ見える形で保留したか
     * @returns {Promise<void>}
     */
    async replyFailure(interaction, error, ephemeral) {
        let content = FAILED_MESSAGE;
        if (error && error.eby && error.type === 'disappointed' && error.explained) {
            // 権限不足など利用者に伝えるべき理由があるときは、それも伝える
            content += '\n' + error.message;
        }
        await this.replyError(interaction, content, ephemeral);
    }
}

/**
 * (private) 会話レスポンスを返信する
 *
 * @this {InteractionResponder}
 * @param {discord.ChatInputCommandInteraction} interaction
 * @param {ChatResponse} chat
 * @param {boolean} ephemeral
 * @returns {Promise<boolean>}
 */
async function replyChatF(interaction, chat, ephemeral) {
    if (chat.code === 'error') {
        await this.replyError(interaction, chat.content, ephemeral);
        return false;
    }
    await interaction.editReply(chat.content);
    return true;
}

/**
 * (private) アクションを実行し、成功・失敗のレスポンスを返信する
 *
 * @this {InteractionResponder}
 * @param {discord.ChatInputCommandInteraction} interaction
 * @param {import('../domain/entity/responses/action_response')} response
 * @param {boolean} ephemeral
 * @returns {Promise<boolean>}
 */
async function respondActionF(interaction, response, ephemeral) {
    try {
        await this.actionHandler.handle(response.action);
    } catch (e) {
        if (e.eby && response.onFailure.type === 'chat') {
            await this.replyError(interaction, response.onFailure.withError(e).content, ephemeral);
            return false;
        }
        throw e;
    }
    return this.respond(interaction, response.onSuccess, ephemeral);
}

module.exports = InteractionResponder;

const path = require('path');
const logger = require('log4js').getLogger(path.basename(__filename));
const assert = require('assert').strict;
const { MessageFlags } = require('discord.js');
const ActionHandler = require('../domain/service/action_handler');
const { pagerButtonRow } = require('./pager_buttons');
const { confirmButtonRow } = require('./confirm_buttons');

/** @typedef {import('discord.js').ChatInputCommandInteraction} discord.ChatInputCommandInteraction */
/** @typedef {import('discord.js').ButtonInteraction} discord.ButtonInteraction */
/** @typedef {import('../domain/entity/responses').ResponseT} ResponseT */
/** @typedef {import('../domain/entity/responses/chat_response')} ChatResponse */

const DONE_MESSAGE = 'コマンドを実行しました！😸';
const FAILED_MESSAGE = 'コマンドの実行に失敗しました･･･😿';

/**
 * レスポンスの返し先
 *
 * @typedef ReplyTarget
 * @type {object}
 *
 * @property {string} commandName 実行したスラッシュコマンド名
 * @property {function({content: string, components?: Array}): Promise<any>} reply 結果を返す
 * @property {function({content: string, components?: Array}): Promise<any>} replyPrivately 実行者にだけ見せる
 */

/**
 * アプリケーションサービス
 * スラッシュコマンドへのレスポンスを、チャンネルへの投稿ではなくインタラクションへの返信として返す
 *
 * - 結果は返し先の reply で、エラーや確認は replyPrivately で実行者にだけ見せる
 * - 返し先はスラッシュコマンドそのもの（commandReplyTarget）か、確認ボタン（confirmedReplyTarget）
 */
class InteractionResponder {
    /**
     * @param {null} actionHandler DomainService
     */
    constructor(actionHandler = null) {
        this.actionHandler = actionHandler || new ActionHandler();
    }

    /**
     * 応答を保留済みのスラッシュコマンドへの返し先
     * - 保留したときの公開範囲（公開 / 実行者のみ）は後から変えられないため、公開で保留していたときは
     *   保留を取り消してから実行者だけに見える返信を送る
     *
     * @param {discord.ChatInputCommandInteraction} interaction 応答を保留済みのスラッシュコマンド
     * @param {boolean} ephemeral 実行者にだけ見える形で保留したか
     * @returns {ReplyTarget}
     */
    static commandReplyTarget(interaction, ephemeral) {
        return {
            commandName: interaction.commandName,
            reply: (payload) => interaction.editReply(payload),
            replyPrivately: async (payload) => {
                if (ephemeral) {
                    return interaction.editReply(payload);
                }
                await interaction.deleteReply().catch((e) => logger.warn('保留した応答の取り消しに失敗', e));
                return interaction.followUp(Object.assign({}, payload, { flags: MessageFlags.Ephemeral }));
            },
        };
    }

    /**
     * 確認ボタンで実行を確定したときの返し先
     * - 確認は実行者にだけ見える返信で行っているため、結果は皆に見えるよう改めて公開で返信する
     *
     * @param {discord.ButtonInteraction} interaction 更新を保留済み（deferUpdate）の確認ボタン
     * @param {string} commandName 確定したスラッシュコマンド名
     * @returns {ReplyTarget}
     */
    static confirmedReplyTarget(interaction, commandName) {
        return {
            commandName,
            reply: async (payload) => {
                await interaction.editReply({ content: DONE_MESSAGE, components: [] });
                return interaction.followUp(payload);
            },
            replyPrivately: (payload) => interaction.editReply(Object.assign({ components: [] }, payload)),
        };
    }

    /**
     * レスポンスを返す
     * - アクションが説明なしで失敗したときは例外をそのまま投げる（ResponseHandlerと同じ）
     *
     * @param {ReplyTarget} target 返し先
     * @param {ResponseT} response コマンドのレスポンス
     * @returns {Promise<boolean>} エラーを返したときは false
     */
    async respond(target, response) {
        assert(typeof target === 'object');
        assert(typeof response === 'object');

        if (response.type === 'chat') {
            return replyChatF.call(this, target, response);
        } else if (response.type === 'action') {
            return respondActionF.call(this, target, response);
        } else if (response.type === 'silent') {
            await target.reply({ content: DONE_MESSAGE });
            return true;
        } else {
            throw new Error(`スラッシュコマンドに返せないレスポンス ${response}`);
        }
    }

    /**
     * 想定外の失敗を実行者に伝える
     *
     * @param {ReplyTarget} target 返し先
     * @param {Error} error 発生したエラー
     * @returns {Promise<void>}
     */
    async replyFailure(target, error) {
        let content = FAILED_MESSAGE;
        if (error && error.eby && error.type === 'disappointed' && error.explained) {
            // 権限不足など利用者に伝えるべき理由があるときは、それも伝える
            content += '\n' + error.message;
        }
        await target.replyPrivately({ content });
    }
}

/**
 * (private) 会話レスポンスを返信する
 *
 * @this {InteractionResponder}
 * @param {ReplyTarget} target
 * @param {ChatResponse} chat
 * @returns {Promise<boolean>}
 */
async function replyChatF(target, chat) {
    if (chat.code === 'error') {
        await target.replyPrivately({ content: chat.content });
        return false;
    }
    if (chat.code === 'force') {
        // 破壊的なコマンドは、実行者にだけ見えるボタンで確定してから実行する
        await target.replyPrivately({ content: chat.content, components: [confirmButtonRow(target.commandName)] });
        return true;
    }
    if (chat.code === 'pager') {
        await target.reply({ content: chat.content, components: [pagerButtonRow()] });
        return true;
    }
    await target.reply({ content: chat.content });
    return true;
}

/**
 * (private) アクションを実行し、成功・失敗のレスポンスを返信する
 *
 * @this {InteractionResponder}
 * @param {ReplyTarget} target
 * @param {import('../domain/entity/responses/action_response')} response
 * @returns {Promise<boolean>}
 */
async function respondActionF(target, response) {
    try {
        await this.actionHandler.handle(response.action);
    } catch (e) {
        if (e.eby && response.onFailure.type === 'chat') {
            await target.replyPrivately({ content: response.onFailure.withError(e).content });
            return false;
        }
        throw e;
    }
    return this.respond(target, response.onSuccess);
}

module.exports = InteractionResponder;

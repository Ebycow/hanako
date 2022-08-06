const path = require('path');
const logger = require('log4js').getLogger(path.basename(__filename));
const assert = require('assert').strict;
const Injector = require('../core/injector');
const IDiscordChatRepo = require('../domain/repo/i_discord_chat_repo');
const IDiscordVoiceRepo = require('../domain/repo/i_discord_voice_repo');
const ActionHandler = require('../domain/service/action_handler');

/** @typedef {import('../domain/entity/responses').ResponseT} ResponseT */
/** @typedef {import('../domain/entity/responses/action_response')} ActionResponse */

/**
 * アプリケーションサービス
 * レスポンスエンティティの処理
 */
class ResponseHandler {
    /**
     * @param {null} chatRepo DI
     * @param {null} voiceRepo DI
     * @param {null} actionHandler Domain Service
     */
    constructor(chatRepo = null, voiceRepo = null, actionHandler = null) {
        this.chatRepo = chatRepo || Injector.resolve(IDiscordChatRepo);
        this.voiceRepo = voiceRepo || Injector.resolve(IDiscordVoiceRepo);
        this.actionHandler = actionHandler || new ActionHandler();
    }

    /**
     * レスポンスエンティティを処理する
     *
     * @param {ResponseT} response レスポンスエンティティ
     * @param {Discord.Interaction} interaction レスポンスタイプ
     * @returns {Promise<void>}
     */
    async handle(response) {
        assert(typeof response === 'object');
        logger.trace(`レスポンスを受理 ${response}`);

        if (response.type === 'voice') {
            // VoiceResponseはそのままDiscordに投げる
            return this.voiceRepo.postVoice(response);
        } else if (response.type === 'chat') {
            // ChatResponseはそのままDiscordに投げる
            return this.chatRepo.postChat(response);
        } else if (response.type === 'action') {
            // ActionResponseは複雑なので専用のメソッドに委譲
            return handleActionResponseF.call(this, response);
        } else if (response.type === 'silent') {
            // SilentResponseはそのまま終了する
            return Promise.resolve();
        } else {
            throw new Error('unreachable');
        }
    }
}

/**
 * (private) アクションレスポンスを処理し、再帰的にthis.handleを呼び出す
 *
 * @this {ResponseHandler}
 * @param {ActionResponse} response
 * @returns {Promise<void>}
 */
async function handleActionResponseF(response) {
    // ActionHandlerにアクションを処理させてPromise<void>を取得
    const promise = this.actionHandler.handle(response.action);

    // Promiseの結果によって後続処理を振り分ける
    let success = true;
    let onFailure = response.onFailure;
    try {
        await promise;
    } catch (e) {
        success = false;
        if (e.eby && onFailure.type === 'chat') {
            // ChatResponseが後続onFailureにあって、発生したのがえびエラーのときはエラー内容を会話に反映する
            onFailure = onFailure.withError(e);
        } else {
            // それ以外は予期せぬエラー
            // TODO FUTURE 当面はこれでいくけど、複雑なコマンドが出てきたらまた変わる
            //             具体的にはonFailureにChatResponse/SilentResponse以外を充てるようなコマンド
            return Promise.reject(e);
        }
    }

    if (success) {
        // onSuccessを再帰的に処理する
        return this.handle(response.onSuccess);
    } else {
        // onFailureを再帰的に処理する
        return this.handle(onFailure);
    }
}

module.exports = ResponseHandler;

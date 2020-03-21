const path = require('path');
const logger = require('log4js').getLogger(path.basename(__filename));
const assert = require('assert').strict;
const Injector = require('../core/injector');
const IDiscordChatRepo = require('../domain/repos/i_discord_chat_repo');
const IDiscordVoiceRepo = require('../domain/repos/i_discord_voice_repo');
const IDiscordVcActionRepo = require('../domain/repos/i_discord_vc_action_repo');

/** @typedef {import('../domain/entities/responses/_response')} Response */
/** @typedef {import('../domain/entities/responses/action_response')} ActionResponse */

/**
 * アプリケーションサービス
 * レスポンスエンティティの処理
 */
class ResponseHandler {
    /**
     * @param {null} chatRepo DI
     * @param {null} voiceRepo DI
     * @param {null} vcActionRepo DI
     */
    constructor(chatRepo = null, voiceRepo = null, vcActionRepo = null) {
        this.chatRepo = chatRepo || Injector.resolve(IDiscordChatRepo);
        this.voiceRepo = voiceRepo || Injector.resolve(IDiscordVoiceRepo);
        this.vcActionRepo = vcActionRepo || Injector.resolve(IDiscordVcActionRepo);
    }

    /**
     * レスポンスエンティティを処理する
     *
     * @param {Response} response レスポンスエンティティ
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
    let promise;
    switch (response.action.type) {
        case 'join_voice':
            promise = this.vcActionRepo.postJoinVoice(response.action);
            break;
        default:
            throw new Error('unreachable');
    }

    let success = true;
    try {
        await promise;
    } catch (e) {
        success = false;
        if (response.onFailure.type !== 'silent') {
            logger.warn(`エラーが発生したが onFailure が指定されているので握りつぶして継続する ${e}`);
        } else {
            return Promise.reject(e);
        }
    }

    if (success) {
        // onSuccessを再帰的に処理する
        return this.handle(response.onSuccess);
    } else {
        // onFailureを再帰的に処理する
        return this.handle(response.onFailure);
    }
}

module.exports = ResponseHandler;

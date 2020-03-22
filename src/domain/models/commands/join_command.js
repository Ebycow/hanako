const path = require('path');
const logger = require('log4js').getLogger(path.basename(__filename));
const assert = require('assert').strict;
const JoinVoiceAction = require('../../entities/actions/join_voice_action');
const ActionResponse = require('../../entities/responses/action_response');

/** @typedef {import('../../entities/command_input')} CommandInput */
/** @typedef {import('../../entities/responses').ResponseT} ResponseT */

/**
 * ドメインモデル
 * VC参加コマンド
 */
class JoinCommand {
    /**
     * @type {'join'}
     */
    get type() {
        return 'join';
    }

    /**
     * @type {string[]}
     */
    static get names() {
        return ['お願い', 'plz', 'summon', 's'];
    }

    /**
     * VC参加コマンドを処理
     *
     * @param {CommandInput} input コマンド引数
     * @returns {ResponseT} レスポンス
     */
    process(input) {
        assert(typeof input === 'object');
        logger.info(`VC参加コマンドを受理 ${input}`);

        if (!input.origin.voiceChannelId) {
            return input.newChatResponse('通話チャンネルに参加してから呼んでね！', 'error');
        }

        // VC参加アクションを作成
        const action = new JoinVoiceAction({
            id: input.id,
            voiceChannelId: input.origin.voiceChannelId,
            textChannelId: input.origin.channelId,
        });
        const onSuccess = input.newChatResponse(`<#${input.origin.channelId}>に参加したよ、よろしくね`);
        return new ActionResponse({ id: input.id, action, onSuccess });
    }
}

module.exports = JoinCommand;

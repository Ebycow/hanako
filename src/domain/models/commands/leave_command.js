const path = require('path');
const logger = require('log4js').getLogger(path.basename(__filename));
const assert = require('assert').strict;
const LeaveVoiceAction = require('../../entities/actions/leave_voice_action');
const ActionResponse = require('../../entities/responses/action_response');

/** @typedef {import('../../entities/command_input')} CommandInput */
/** @typedef {import('../../entities/responses').ResponseT} ResponseT */
/** @typedef {import('../../entities/server_status')} ServerStatus */

/**
 * ドメインモデル
 * VC退出コマンド
 */
class LeaveCommand {
    /**
     * @type {'leave'}
     */
    get type() {
        return 'leave';
    }

    /**
     * @type {string[]}
     */
    static get names() {
        return ['さようなら', 'bye', 'b'];
    }

    /**
     * @param {ServerStatus} status コマンド実行下のサーバー状態
     */
    constructor(status) {
        this.status = status;
    }

    /**
     * VC退出コマンドを処理
     *
     * @param {CommandInput} input コマンド引数
     * @returns {ResponseT} レスポンス
     */
    process(input) {
        assert(typeof input === 'object');
        logger.info(`VC退出コマンドを受理 ${input}`);

        if (this.status.voiceChannel === null) {
            return input.newChatResponse('どこのチャンネルにも参加していないか、エラーが発生しています :sob:', 'error');
        }

        // VC退出アクションを作成
        const action = new LeaveVoiceAction({
            id: input.id,
            serverId: input.origin.serverId,
        });
        return new ActionResponse({ id: input.id, action });
    }
}

module.exports = LeaveCommand;

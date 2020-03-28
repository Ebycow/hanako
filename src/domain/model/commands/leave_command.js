const path = require('path');
const logger = require('log4js').getLogger(path.basename(__filename));
const assert = require('assert').strict;
const LeaveVoiceAction = require('../../entity/actions/leave_voice_action');
const ActionResponse = require('../../entity/responses/action_response');

/** @typedef {import('../../entity/command_input')} CommandInput */
/** @typedef {import('../../entity/responses').ResponseT} ResponseT */
/** @typedef {import('../../model/hanako')} Hanako */

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
     * @param {Hanako} hanako コマンド実行下の読み上げ花子
     */
    constructor(hanako) {
        this.hanako = hanako;
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

        if (this.hanako.voiceStatus === null) {
            return input.newChatResponse('このコマンドは私を通話チャンネルに招待してからつかってね！', 'error');
        }

        // VC退出アクションを作成
        const action = new LeaveVoiceAction({
            id: input.id,
            serverId: input.serverId,
        });
        return new ActionResponse({ id: input.id, action });
    }
}

module.exports = LeaveCommand;

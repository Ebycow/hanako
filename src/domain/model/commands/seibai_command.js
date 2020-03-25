const path = require('path');
const logger = require('log4js').getLogger(path.basename(__filename));
const assert = require('assert').strict;
const SeibaiAction = require('../../entity/actions/seibai_action');
const ActionResponse = require('../../entity/responses/action_response');

/** @typedef {import('../../entity/command_input')} CommandInput */
/** @typedef {import('../../entity/responses').ResponseT} ResponseT */
/** @typedef {import('../../entity/server_status')} ServerStatus */

/**
 * ドメインモデル
 * 成敗コマンド
 */
class SeibaiCommand {
    /**
     * @type {'seibai'}
     */
    get type() {
        return 'seibai';
    }

    /**
     * @type {string[]}
     */
    static get names() {
        return ['成敗', 'seibai', 'stop'];
    }

    /**
     * @param {ServerStatus} status コマンド実行下のサーバー状態
     */
    constructor(status) {
        this.status = status;
    }

    /**
     * 成敗コマンドを処理
     *
     * @param {CommandInput} input コマンド引数
     * @returns {ResponseT} レスポンス
     */
    process(input) {
        assert(typeof input === 'object');
        logger.info(`成敗コマンドを受理 ${input}`);

        if (this.status.voiceStatus !== 'speaking') {
            return input.newChatResponse('安心せい、みねうちにゃ… :knife:', 'error');
        }

        // 成敗アクションを作成
        const action = new SeibaiAction({
            id: input.id,
            serverId: input.origin.serverId,
        });
        const onSuccess = input.newChatResponse('戯け者 余の顔を見忘れたか :knife:');
        return new ActionResponse({ id: input.id, action, onSuccess });
    }
}

module.exports = SeibaiCommand;

const path = require('path');
const logger = require('log4js').getLogger(path.basename(__filename));
const assert = require('assert').strict;
const SeibaiAction = require('../../entity/actions/seibai_action');
const ActionResponse = require('../../entity/responses/action_response');

/** @typedef {import('../../entity/command_input')} CommandInput */
/** @typedef {import('../../entity/responses').ResponseT} ResponseT */
/** @typedef {import('../../model/hanako')} Hanako */

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
     * @param {Hanako} hanako コマンド実行下の読み上げ花子
     */
    constructor(hanako) {
        this.hanako = hanako;
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

        if (this.hanako.voiceStatus === null) {
            return input.newChatResponse('このコマンドは私を通話チャンネルに招待してからつかってね！', 'error');
        }

        if (this.hanako.voiceStatus.state !== 'speaking') {
            return input.newChatResponse('安心せい、みねうちにゃ… :knife:', 'error');
        }

        // 成敗アクションを作成
        const action = new SeibaiAction({
            id: input.id,
            serverId: input.serverId,
        });
        const onSuccess = input.newChatResponse('戯け者 余の顔を見忘れたか :knife:');
        return new ActionResponse({ id: input.id, action, onSuccess });
    }
}

module.exports = SeibaiCommand;

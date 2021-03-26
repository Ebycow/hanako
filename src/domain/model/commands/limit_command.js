const path = require('path');
const logger = require('log4js').getLogger(path.basename(__filename));
const assert = require('assert').strict;
const MaxCountUpdateAction = require('../../entity/actions/max_count_update_action');
const ActionResponse = require('../../entity/responses/action_response');

/** @typedef {import('../../entity/command_input')} CommandInput */
/** @typedef {import('../../entity/responses').ResponseT} ResponseT */
/** @typedef {import('../../model/hanako')} Hanako */

/**
 * ドメインモデル
 * 最大読み上げ文字数制限コマンド
 */
class LimitCommand {
    /**
     * @type {'limit'}
     */
    get type() {
        return 'limit';
    }

    /**
     * @type {string[]}
     */
    static get names() {
        return ['制限', 'limit', 'readlimit'];
    }

    /**
     * @param {Hanako} hanako コマンド実行下の読み上げ花子
     */
    constructor(hanako) {
        this.hanako = hanako;
    }

    /**
     * 最大読み上げ文字数制限コマンドを処理
     *
     * @param {CommandInput} input コマンド引数
     * @returns {ResponseT} レスポンス
     */
    process(input) {
        assert(typeof input === 'object');
        logger.info(`最大読み上げ文字数制限コマンドを受理 ${input}`);

        // コマンド形式のバリデーション
        if (input.argc !== 1 || !Number.isInteger(Number.parseInt(input.argv[0], 10))) {
            return input.newChatResponse('コマンドの形式が間違っています :sob: 例:`@hanako 制限 500`', 'error');
        }

        const newMaxCount = Number.parseInt(input.argv[0], 10);

        // 設定値下限のバリデーション
        if (newMaxCount < 0) {
            return input.newChatResponse('マイナスを指定しないで :sob:', 'error');
        }

        // 設定値上限のバリデーション (Discord最大文字数=2000)
        if (newMaxCount > 2000) {
            return input.newChatResponse('文字数は0から2000の間で指定してね', 'error');
        }

        // 最大読み上げ文字数更新アクションを作成
        const action = new MaxCountUpdateAction({
            id: input.id,
            serverId: input.serverId,
            maxCount: newMaxCount,
        });
        let onSuccess;
        if (newMaxCount === 0) {
            onSuccess = input.newChatResponse('読み上げる文字数の制限を解除しました :beginner:');
        } else {
            onSuccess = input.newChatResponse(`読み上げる文字数を${newMaxCount}文字に制限しました :no_entry:`);
        }
        return new ActionResponse({ id: input.id, action, onSuccess });
    }
}

module.exports = LimitCommand;

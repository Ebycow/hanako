const path = require('path');
const logger = require('log4js').getLogger(path.basename(__filename));
const assert = require('assert').strict;
const FoleyDeleteAction = require('../../entity/actions/foley_delete_action');
const ActionResponse = require('../../entity/responses/action_response');

/** @typedef {import('../../entity/command_input')} CommandInput */
/** @typedef {import('../../entity/responses').ResponseT} ResponseT */
/** @typedef {import('../../model/hanako')} Hanako */

/**
 * ドメインモデル
 * SE削除コマンド
 */
class FoleyDeleteCommand {
    /**
     * @type {'foley_delete'}
     */
    get type() {
        return 'foley_delete';
    }

    /**
     * @type {string[]}
     */
    static get names() {
        return ['音声忘却', 'se-delete', 'se-del'];
    }

    /**
     * @param {Hanako} hanako コマンド実行下の読み上げ花子
     */
    constructor(hanako) {
        this.hanako = hanako;
    }

    /**
     * SE削除コマンドを処理
     *
     * @param {CommandInput} input コマンド引数
     * @returns {ResponseT} レスポンス
     */
    process(input) {
        assert(typeof input === 'object');
        logger.info(`SE削除コマンドを受理 ${input}`);

        // コマンド形式のバリデーション
        if (input.argc !== 1) {
            return input.newChatResponse(
                'コマンドの形式が間違っています :sob: 例:`@hanako 音声忘却 三倍アイスクリーム`',
                'error'
            );
        }

        const foley = this.hanako.foleyDictionary.lines.find(line => line.keyword === input.argv[0]);

        // 単語が見つからない
        if (!foley) {
            return input.newChatResponse('キーワードに対応するSEが登録されていません', 'error');
        }

        // SE削除アクションを作成
        const action = new FoleyDeleteAction({
            id: input.id,
            serverId: input.serverId,
            foleyId: foley.id,
        });
        const onSuccess = input.newChatResponse(`1 2の…ポカン！『${foley.keyword}』のSE設定を忘れました！ :bulb:`);
        const onFailure = input.newChatResponse('SE削除中にエラーが発生しました :sob:', 'error');
        return new ActionResponse({ id: input.id, action, onSuccess, onFailure });
    }
}

module.exports = FoleyDeleteCommand;

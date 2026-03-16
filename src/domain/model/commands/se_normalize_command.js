const path = require('path');
const logger = require('log4js').getLogger(path.basename(__filename));
const assert = require('assert').strict;
const SeNormalizeUpdateAction = require('../../entity/actions/se_normalize_update_action');
const ActionResponse = require('../../entity/responses/action_response');

/** @typedef {import('../../entity/command_input')} CommandInput */
/** @typedef {import('../../entity/responses').ResponseT} ResponseT */
/** @typedef {import('../../model/hanako')} Hanako */

/**
 * ドメインモデル
 * SE音量正規化コマンド
 */
class SeNormalizeCommand {
    /**
     * @type {'se_normalize'}
     */
    get type() {
        return 'se_normalize';
    }

    /**
     * @type {string[]}
     */
    static get names() {
        return ['SE正規化', 'se-normalize', 'senorm'];
    }

    /**
     * @param {Hanako} hanako コマンド実行下の読み上げ花子
     */
    constructor(hanako) {
        this.hanako = hanako;
    }

    /**
     * SE音量正規化コマンドを処理
     *
     * @param {CommandInput} input コマンド引数
     * @returns {ResponseT} レスポンス
     */
    process(input) {
        assert(typeof input === 'object');
        logger.info(`SE音量正規化コマンドを受理 ${input}`);

        // コマンド形式のバリデーション
        const parsed = Number.parseInt(input.argv[0], 10);
        const isDecimal = input.argv[0] && input.argv[0].includes('.');
        if (input.argc !== 1 || !Number.isInteger(parsed) || isDecimal) {
            return input.newChatResponse('コマンドの形式が間違っています :sob: 例:`@hanako se-normalize 80`', 'error');
        }

        const newSeNormalizePercent = parsed;

        // 設定値範囲のバリデーション (0-100)
        if (newSeNormalizePercent < 0 || newSeNormalizePercent > 100) {
            return input.newChatResponse('SE正規化レベルは0から100の間で指定してね', 'error');
        }

        // 0～100を0.0～1.0に変換
        const newSeNormalize = newSeNormalizePercent / 100;

        // SE正規化更新アクションを作成
        const action = new SeNormalizeUpdateAction({
            id: input.id,
            serverId: input.serverId,
            seNormalize: newSeNormalize,
        });

        let onSuccess;
        if (newSeNormalizePercent === 0) {
            onSuccess = input.newChatResponse('SE正規化を無効にしました（0%） :mute:');
        } else {
            onSuccess = input.newChatResponse(`SEを${newSeNormalizePercent}%に正規化するよう設定しました :loud_sound:`);
        }

        return new ActionResponse({ id: input.id, action, onSuccess });
    }
}

module.exports = SeNormalizeCommand;

const path = require('path');
const logger = require('log4js').getLogger(path.basename(__filename));
const assert = require('assert').strict;
const SilenceClearAction = require('../../entity/actions/silence_clear_action');
const ActionResponse = require('../../entity/responses/action_response');

/** @typedef {import('../../entity/command_input')} CommandInput */
/** @typedef {import('../../entity/responses').ResponseT} ResponseT */
/** @typedef {import('../../model/hanako')} Hanako */

/**
 * ドメインモデル
 * 沈黙ユーザー初期化コマンド
 */
class SilenceClearCommand {
    /**
     * @type {'silence_clear'}
     */
    get type() {
        return 'silence_clear';
    }

    /**
     * @type {string[]}
     */
    static get names() {
        return ['大赦', 'blacklist-clear'];
    }

    /**
     * @param {Hanako} hanako コマンド実行下の読み上げ花子
     */
    constructor(hanako) {
        this.hanako = hanako;
    }

    /**
     * 沈黙ユーザー初期化コマンドを処理
     *
     * @param {CommandInput} input コマンド引数
     * @returns {ResponseT} レスポンス
     */
    process(input) {
        assert(typeof input === 'object');
        logger.info(`沈黙ユーザー初期化コマンドを受理 ${input}`);

        if (this.hanako.silenceDictionary.lines.length === 0) {
            return input.newChatResponse(
                '読み上げ停止中のユーザーはいません。\n沈黙コマンドを使うと個別に読み上げを停止できます。 例:`@hanako 沈黙 @Ebycow`',
                'error'
            );
        }

        if (input.argc !== 1 || input.argv[0] !== '--force') {
            return input.newChatResponse(
                '**ほんとうにけすのですか？ こうかいしませんね？**\n読み上げ停止中のユーザーを全て解除する場合はコマンドに `--force` を付けてください。例:`@hanako 大赦 --force`',
                'force'
            );
        }

        // 沈黙初期化アクションを作成
        const action = new SilenceClearAction({
            id: input.id,
            serverId: input.serverId,
        });
        const onSuccess = input.newChatResponse(
            'まっさらに生まれ変わって 人生一から始めようが\nへばりついて離れない 地続きの今を歩いているんだ :bulb:'
        );
        return new ActionResponse({ id: input.id, action, onSuccess });
    }
}

module.exports = SilenceClearCommand;

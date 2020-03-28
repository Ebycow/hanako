const path = require('path');
const logger = require('log4js').getLogger(path.basename(__filename));
const assert = require('assert').strict;
const WordClearAction = require('../../entity/actions/word_clear_action');
const ActionResponse = require('../../entity/responses/action_response');

/** @typedef {import('../../entity/command_input')} CommandInput */
/** @typedef {import('../../entity/responses').ResponseT} ResponseT */
/** @typedef {import('../../model/hanako')} Hanako */

/**
 * ドメインモデル
 * 教育単語初期化コマンド
 */
class WordClearCommand {
    /**
     * @type {'word_clear'}
     */
    get type() {
        return 'word_clear';
    }

    /**
     * @type {string[]}
     */
    static get names() {
        return ['白日', 'alldelete', 'wbook-alldel'];
    }

    /**
     * @param {Hanako} hanako コマンド実行下の読み上げ花子
     */
    constructor(hanako) {
        this.hanako = hanako;
    }

    /**
     * 教育単語初期化コマンドを処理
     *
     * @param {CommandInput} input コマンド引数
     * @returns {ResponseT} レスポンス
     */
    process(input) {
        assert(typeof input === 'object');
        logger.info(`教育単語初期化コマンドを受理 ${input}`);

        if (this.hanako.wordDictionary.lines.length === 0) {
            return input.newChatResponse(
                '辞書にはまだなにも登録されていません。\n教育コマンドを使って単語と読み方を登録できます！ 例:`@hanako 教育 雷 いかずち`',
                'error'
            );
        }

        if (input.argc !== 1 || input.argv[0] !== '--force') {
            return input.newChatResponse(
                '**ほんとうにけすのですか？ こうかいしませんね？**\nすべての単語を削除する場合はコマンドに `--force` を付けてください。例:`@hanako 白日 --force`',
                'force'
            );
        }

        // 教育単語初期化アクションを作成
        const action = new WordClearAction({
            id: input.id,
            serverId: input.serverId,
        });
        const onSuccess = input.newChatResponse(
            'まっさらに生まれ変わって 人生一から始めようが\nへばりついて離れない 地続きの今を歩いているんだ :bulb:'
        );
        return new ActionResponse({ id: input.id, action, onSuccess });
    }
}

module.exports = WordClearCommand;

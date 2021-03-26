const path = require('path');
const logger = require('log4js').getLogger(path.basename(__filename));
const assert = require('assert').strict;
const Pager = require('../pager');

/** @typedef {import('../../entity/command_input')} CommandInput */
/** @typedef {import('../../entity/responses').ResponseT} ResponseT */
/** @typedef {import('../../model/hanako')} Hanako */

/**
 * ドメインモデル
 * 教育単語一覧コマンド
 */
class WordReadCommand {
    /**
     * @type {'word_read'}
     */
    get type() {
        return 'word_read';
    }

    /**
     * @type {string[]}
     */
    static get names() {
        return ['辞書', 'dictionary', 'dic', 'wbook-list'];
    }

    /**
     * @param {Hanako} hanako コマンド実行下の読み上げ花子
     */
    constructor(hanako) {
        this.hanako = hanako;
    }

    /**
     * 教育単語一覧コマンドを処理
     *
     * @param {CommandInput} input コマンド引数
     * @returns {ResponseT} レスポンス
     */
    process(input) {
        assert(typeof input === 'object');
        logger.info(`教育単語一覧コマンドを受理 ${input}`);

        if (this.hanako.wordDictionary.lines.length === 0) {
            return input.newChatResponse(
                '辞書にはまだなにも登録されていません。\n教育コマンドを使って単語と読み方を登録できます！ 例:`@hanako 教育 雷 いかずち`',
                'error'
            );
        }

        // ページ会話レスポンス
        const pager = new Pager(this.hanako.wordDictionary);
        return input.newChatResponse(pager.show(), 'pager');
    }
}

module.exports = WordReadCommand;

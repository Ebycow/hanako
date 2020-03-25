const assert = require('assert').strict;
const utils = require('../../../core/utils');

/** @typedef {import('../../entity/server_status')} ServerStatus */

/**
 * ドメインモデル
 * 教育単語辞書文字列フォーマッター
 */
class WordDictionaryFormatter {
    /**
     * @returns {'word_dictionary'}
     */
    get type() {
        return 'word_dictionary';
    }

    /**
     * @param {ServerStatus} status フォーマッター実行下のサーバー状態
     */
    constructor(status) {
        this.status = status;
    }

    /**
     * 教育単語辞書の全置換を実行
     *
     * @param {string} text 入力文字列
     * @returns {string} 出力文字列
     */
    format(text) {
        assert(typeof text === 'string');

        // 空文字列はフォーマット処理しない
        if (utils.countUnicode(text) === 0) {
            return '';
        }

        // 教育単語辞書に登録がないなら処理しない
        if (this.status.wordDictionary.lines.length === 0) {
            return text;
        }

        // 辞書置換を実行
        const lines = this.status.wordDictionary.lines;
        const result = lines.reduce((str, line) => str.split(line.from).join(line.to), text);
        return result;
    }
}

module.exports = WordDictionaryFormatter;

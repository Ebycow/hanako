const assert = require('assert').strict;
const utils = require('../../../core/utils');

/** @typedef {import('../../model/hanako')} Hanako */

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
     * @param {Hanako} hanako フォーマッター実行下の読み上げ花子モデル
     */
    constructor(hanako) {
        this.hanako = hanako;
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
        if (this.hanako.wordDictionary.lines.length === 0) {
            return text;
        }

        // 辞書置換を実行
        const lines = this.hanako.wordDictionary.lines;
        const result = lines.reduce((str, line) => str.split(line.from).join(line.to), text);
        return result;
    }
}

module.exports = WordDictionaryFormatter;

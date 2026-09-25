const assert = require('assert').strict;
const utils = require('../../../core/utils');

/** @typedef {import('../../model/hanako')} Hanako */
/** @typedef {{content: string, isFoley: boolean}} TextSegment */

/**
 * 登録済みSE名に一致する範囲を辞書置換から保護する
 * FoleyDictionaryは長いキーワード順に並んでいるため、重なる場合は長いSE名を優先する。
 *
 * @param {string} text
 * @param {import('../../entity/foley_dictionary_line')[]} foleyLines
 * @returns {TextSegment[]}
 */
function splitByFoleyKeywords(text, foleyLines) {
    return foleyLines.reduce(
        (segments, line) =>
            segments.flatMap((segment) => {
                if (segment.isFoley || !segment.content.includes(line.keyword)) {
                    return [segment];
                }

                const parts = segment.content.split(line.keyword);
                return parts.flatMap((content, index) => {
                    const result = [];
                    if (content.length > 0) {
                        result.push({ content, isFoley: false });
                    }
                    if (index < parts.length - 1) {
                        result.push({ content: line.keyword, isFoley: true });
                    }
                    return result;
                });
            }),
        [{ content: text, isFoley: false }]
    );
}

/**
 * 教育辞書による置換を実行する
 *
 * @param {string} text
 * @param {import('../../entity/word_dictionary_line')[]} wordLines
 * @returns {string}
 */
function replaceWords(text, wordLines) {
    return wordLines.reduce((str, line) => str.split(line.from).join(line.to), text);
}

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

        const wordLines = this.hanako.wordDictionary.lines;
        const foleyLines = this.hanako.foleyDictionary.lines;

        // SE名に一致した部分を保護し、それ以外の文章だけに辞書置換を適用する
        return splitByFoleyKeywords(text, foleyLines)
            .map((segment) => (segment.isFoley ? segment.content : replaceWords(segment.content, wordLines)))
            .join('');
    }
}

module.exports = WordDictionaryFormatter;

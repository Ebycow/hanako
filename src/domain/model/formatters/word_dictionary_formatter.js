const assert = require('assert').strict;
const utils = require('../../../core/utils');

/** @typedef {import('../../model/hanako')} Hanako */
/** @typedef {{content: string, isFoley: boolean}} TextSegment */
/** @typedef {{table: Map<string, string>, lengthsByHead: Map<string, number[]>}} WordTable */

/**
 * 登録済みSE名に一致する範囲を辞書置換から保護する
 * readingKeywordsは長いキーワード順に並んでいるため、重なる場合は長いSE名を優先する。
 *
 * @param {string} text
 * @param {string[]} foleyKeywords
 * @returns {TextSegment[]}
 */
function splitByFoleyKeywords(text, foleyKeywords) {
    return foleyKeywords.reduce(
        (segments, keyword) =>
            segments.flatMap((segment) => {
                if (segment.isFoley || !segment.content.includes(keyword)) {
                    return [segment];
                }

                const parts = segment.content.split(keyword);
                return parts.flatMap((content, index) => {
                    const result = [];
                    if (content.length > 0) {
                        result.push({ content, isFoley: false });
                    }
                    if (index < parts.length - 1) {
                        result.push({ content: keyword, isFoley: true });
                    }
                    return result;
                });
            }),
        [{ content: text, isFoley: false }]
    );
}

/**
 * 教育辞書を照合用の表にする
 * 読み上げ文は文字種統一済みなので、登録も文字種をそろえてから表にする。
 * 文字種をそろえると同じ単語になる登録が複数ある場合は、先に並んでいる登録を使う。
 *
 * @param {import('../../entity/word_dictionary_line')[]} wordLines
 * @returns {WordTable}
 */
function buildWordTable(wordLines) {
    const table = new Map();
    const lengthSetsByHead = new Map();
    for (const line of wordLines) {
        const from = utils.unifyCharacterWidth(line.from);
        if (table.has(from)) {
            continue;
        }
        table.set(from, utils.unifyCharacterWidth(line.to));

        const chars = Array.from(from);
        const lengths = lengthSetsByHead.get(chars[0]) ?? new Set();
        lengths.add(chars.length);
        lengthSetsByHead.set(chars[0], lengths);
    }

    // 先頭の文字ごとに、その文字で始まる登録の文字数を長い順に持つ
    const lengthsByHead = new Map();
    for (const [head, lengths] of lengthSetsByHead) {
        lengthsByHead.set(
            head,
            [...lengths].sort((a, b) => b - a)
        );
    }
    return { table, lengthsByHead };
}

/**
 * 教育辞書による置換を実行する
 * 左から順に、その位置で最も長く一致する登録で置換する。
 * 置換結果は再び検索しないため、登録どうしが連鎖して文字列が膨張することはない。
 *
 * @param {string} text
 * @param {WordTable} wordTable
 * @returns {string}
 */
function replaceWords(text, { table, lengthsByHead }) {
    // 絵文字を途中で切らないよう、countUnicodeと同じくコードポイント単位で扱う
    const chars = Array.from(text);
    let result = '';
    let i = 0;
    while (i < chars.length) {
        const lengths = lengthsByHead.get(chars[i]) ?? [];
        const length = lengths.find((n) => i + n <= chars.length && table.has(chars.slice(i, i + n).join('')));
        if (length === undefined) {
            result += chars[i];
            i += 1;
        } else {
            result += table.get(chars.slice(i, i + length).join(''));
            i += length;
        }
    }
    return result;
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

        const wordTable = buildWordTable(this.hanako.wordDictionary.lines);
        const foleyKeywords = this.hanako.foleyDictionary.readingKeywords.map((entry) => entry.keyword);

        // SE名に一致した部分を保護し、それ以外の文章だけに辞書置換を適用する
        return splitByFoleyKeywords(text, foleyKeywords)
            .map((segment) => (segment.isFoley ? segment.content : replaceWords(segment.content, wordTable)))
            .join('');
    }
}

module.exports = WordDictionaryFormatter;

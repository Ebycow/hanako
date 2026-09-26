const path = require('path');
const logger = require('log4js').getLogger(path.basename(__filename));
const assert = require('assert').strict;

const MATCH_TYPE = Object.freeze({
    exact: 0,
    prefix: 1,
    partial: 2,
    allWords: 3,
});

/**
 * SE名を検索用に正規化する
 *
 * @param {string} value
 * @returns {string}
 */
function normalize(value) {
    return value.toLowerCase();
}

/**
 * 検索語と登録名の一部分とのレーベンシュタイン距離を計算する
 * 登録名の前後にある文字は距離に含めない。
 *
 * @param {string} query
 * @param {string} keyword
 * @returns {number}
 */
function partialLevenshteinDistance(query, keyword) {
    const queryChars = Array.from(query);
    const keywordChars = Array.from(keyword);
    let previous = new Array(keywordChars.length + 1).fill(0);

    for (let i = 1; i <= queryChars.length; i++) {
        const current = [i];

        for (let j = 1; j <= keywordChars.length; j++) {
            const substitutionCost = queryChars[i - 1] === keywordChars[j - 1] ? 0 : 1;
            current[j] = Math.min(previous[j] + 1, current[j - 1] + 1, previous[j - 1] + substitutionCost);
        }

        previous = current;
    }

    return Math.min(...previous);
}

/**
 * 検索語の長さに応じて許容する誤字数を返す
 * 短すぎる検索語では、無関係な候補を避けるためあいまい一致を行わない。
 *
 * @param {string} query
 * @returns {number}
 */
function maxFuzzyDistance(query) {
    const length = Array.from(query).length;
    if (length <= 2) return 0;
    return Math.min(3, Math.max(1, Math.floor(length / 4)));
}

/**
 * 文字列一致の種類と、同じ種類内での並び順を返す
 *
 * @param {string} query
 * @param {string[]} words
 * @param {string} keyword
 * @returns {{type: number, extraLength: number, matchPosition: number} | null}
 */
function lexicalMatch(query, words, keyword) {
    const extraLength = Array.from(keyword).length - Array.from(query).length;

    if (keyword === query) {
        return { type: MATCH_TYPE.exact, extraLength: 0, matchPosition: 0 };
    }
    if (keyword.startsWith(query)) {
        return { type: MATCH_TYPE.prefix, extraLength, matchPosition: 0 };
    }

    const matchPosition = keyword.indexOf(query);
    if (matchPosition !== -1) {
        return { type: MATCH_TYPE.partial, extraLength, matchPosition };
    }
    if (words.length > 1 && words.every((word) => keyword.includes(word))) {
        return { type: MATCH_TYPE.allWords, extraLength, matchPosition: 0 };
    }

    return null;
}

/**
 * 検索候補を並べ替える
 *
 * @param {{type: number, extraLength: number, matchPosition: number, index: number}} a
 * @param {{type: number, extraLength: number, matchPosition: number, index: number}} b
 * @returns {number}
 */
function compareLexicalMatches(a, b) {
    return a.type - b.type || a.extraLength - b.extraLength || a.matchPosition - b.matchPosition || a.index - b.index;
}

/** @typedef {import('./index').SlashCommandDefinition} SlashCommandDefinition */
/** @typedef {import('../../entity/command_input')} CommandInput */
/** @typedef {import('../../entity/responses').ResponseT} ResponseT */
/** @typedef {import('../../model/hanako')} Hanako */

/**
 * ドメインモデル
 * SE検索コマンド
 */
class FoleySearchCommand {
    /**
     * @type {'foley_search'}
     */
    get type() {
        return 'foley_search';
    }

    /**
     * @type {string[]}
     */
    static get names() {
        return ['se?'];
    }

    /**
     * スラッシュコマンドの定義
     *
     * @type {SlashCommandDefinition}
     */
    static get slash() {
        return {
            name: 'se-search',
            description: 'SEをキーワードで検索します',
            options: [{ type: 'string', name: 'keyword', description: '検索キーワード', required: true }],
        };
    }

    /**
     * テキストで入力された引数を名前付きの引数に変換
     *
     * @param {CommandInput} input コマンド引数
     * @returns {{args: {keyword: string}}|{response: ResponseT}} 名前付きの引数、または形式エラーのレスポンス
     */
    static parseText(input) {
        if (input.argc === 0) {
            return {
                response: input.newChatResponse('検索するSE名を入力してね！ 例: `@hanako se? タピオカ`', 'error'),
            };
        }
        return { args: { keyword: input.argv.join(' ') } };
    }

    /**
     * @param {Hanako} hanako コマンド実行下の読み上げ花子
     */
    constructor(hanako) {
        this.hanako = hanako;
    }

    /**
     * SE検索コマンドを処理
     *
     * @param {CommandInput} input コマンド引数
     * @returns {ResponseT} レスポンス
     */
    process(input) {
        assert(typeof input === 'object');
        logger.info(`SE検索コマンドを受理 ${input}`);

        const query = normalize(input.args.keyword.trim());

        if (this.hanako.foleyDictionary.lines.length === 0) {
            return input.newChatResponse(
                '音声辞書にはまだなにも登録されていません。\n音声教育コマンドを使ってキーワードとSEを登録できます！',
                'error'
            );
        }

        const words = query.split(/\s+/).filter((word) => word.length > 0);
        const lines = this.hanako.foleyDictionary.lines;

        // 完全一致、前方一致、部分一致、全単語一致の順に検索する
        const lexicalSuggestions = lines
            .map((line, index) => ({
                keyword: line.keyword,
                index,
                match: lexicalMatch(query, words, normalize(line.keyword)),
            }))
            .filter((item) => item.match !== null)
            .map((item) => ({ ...item, ...item.match }))
            .sort(compareLexicalMatches)
            .slice(0, 5)
            .map((item) => item.keyword);

        // 文字列一致がなかった場合だけ、誤字を考慮して登録名の一部分と比較する
        const maxDistance = maxFuzzyDistance(query);
        const suggestions =
            lexicalSuggestions.length > 0
                ? lexicalSuggestions
                : lines
                      .map((line, index) => ({
                          keyword: line.keyword,
                          index,
                          distance: partialLevenshteinDistance(query, normalize(line.keyword)),
                      }))
                      .filter((item) => maxDistance > 0 && item.distance <= maxDistance)
                      .sort(
                          (a, b) =>
                              a.distance - b.distance ||
                              Array.from(a.keyword).length - Array.from(b.keyword).length ||
                              a.index - b.index
                      )
                      .slice(0, 5)
                      .map((item) => item.keyword);

        if (suggestions.length === 0) {
            return input.newChatResponse('近いSEは見つからなかったよ :sob:');
        }

        const message = `もしかしてこれかな: ${suggestions.join(' ')}`;
        return input.newChatResponse(message);
    }
}

module.exports = FoleySearchCommand;

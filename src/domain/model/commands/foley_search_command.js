const path = require('path');
const logger = require('log4js').getLogger(path.basename(__filename));
const assert = require('assert').strict;
const utils = require('../../../core/utils');

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

        if (input.argc === 0) {
            return input.newChatResponse('検索するSE名を入力してね！ 例: `@hanako se? タピオカ`', 'error');
        }

        const query = input.argv.join(' ').trim();

        if (this.hanako.foleyDictionary.lines.length === 0) {
            return input.newChatResponse(
                '音声辞書にはまだなにも登録されていません。\n音声教育コマンドを使ってキーワードとSEを登録できます！',
                'error'
            );
        }

        // 各SEとの距離を計算して近い順にソート
        const suggestions = this.hanako.foleyDictionary.lines
            .map(line => ({
                keyword: line.keyword,
                distance: utils.levenshteinDistance(query.toLowerCase(), line.keyword.toLowerCase()),
            }))
            .sort((a, b) => a.distance - b.distance)
            .slice(0, 5) // 上位5つ
            .map(item => item.keyword);

        const message = `もしかしてこれかな: ${suggestions.join(' ')}`;
        return input.newChatResponse(message);
    }
}

module.exports = FoleySearchCommand;

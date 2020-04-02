const path = require('path');
const logger = require('log4js').getLogger(path.basename(__filename));
const assert = require('assert').strict;
const Pager = require('../pager');

/** @typedef {import('../../entity/command_input')} CommandInput */
/** @typedef {import('../../entity/responses').ResponseT} ResponseT */
/** @typedef {import('../../model/hanako')} Hanako */

/**
 * ドメインモデル
 * SE一覧コマンド
 */
class FoleyReadCommand {
    /**
     * @type {'foley_read'}
     */
    get type() {
        return 'foley_read';
    }

    /**
     * @type {string[]}
     */
    static get names() {
        return ['音声辞書', '音声一覧', 'se-dictionary', 'se-dic', 'se-list'];
    }

    /**
     * @param {Hanako} hanako コマンド実行下の読み上げ花子
     */
    constructor(hanako) {
        this.hanako = hanako;
    }

    /**
     * SE一覧コマンドを処理
     *
     * @param {CommandInput} input コマンド引数
     * @returns {ResponseT} レスポンス
     */
    process(input) {
        assert(typeof input === 'object');
        logger.info(`SE一覧コマンドを受理 ${input}`);

        if (this.hanako.foleyDictionary.lines.length === 0) {
            return input.newChatResponse(
                '音声辞書にはまだなにも登録されていません。\n音声教育コマンドを使ってキーワードとSEを登録できます！ 例:`@hanako 音声教育 ﾀﾋﾟｵｶｳﾒｽ https://upload.ebycow.com/dirty-of-loudness.mp3`',
                'error'
            );
        }

        // ページ会話レスポンス
        const pager = new Pager(this.hanako.foleyDictionary);
        return input.newChatResponse(pager.show(), 'pager');
    }
}

module.exports = FoleyReadCommand;

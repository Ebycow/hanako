const path = require('path');
const logger = require('log4js').getLogger(path.basename(__filename));
const assert = require('assert').strict;
const Pager = require('../pager');

/** @typedef {import('../../entity/command_input')} CommandInput */
/** @typedef {import('../../entity/responses').ResponseT} ResponseT */
/** @typedef {import('../../model/hanako')} Hanako */

/**
 * ドメインモデル
 * 沈黙ユーザーの一覧コマンド
 */
class SilenceReadCommand {
    /**
     * @type {'silence_read'}
     */
    get type() {
        return 'silence_read';
    }

    /**
     * @type {string[]}
     */
    static get names() {
        return ['名簿', 'blacklist-show'];
    }

    /**
     * @param {Hanako} hanako コマンド実行下の読み上げ花子
     */
    constructor(hanako) {
        this.hanako = hanako;
    }

    /**
     * 沈黙ユーザーの一覧コマンドを処理
     *
     * @param {CommandInput} input コマンド引数
     * @returns {ResponseT} レスポンス
     */
    process(input) {
        assert(typeof input === 'object');
        logger.info(`沈黙ユーザーの一覧コマンドを受理 ${input}`);

        if (this.hanako.silenceDictionary.lines.length === 0) {
            return input.newChatResponse(
                '読み上げ停止中のユーザーはいません。\n沈黙コマンドを使うと個別に読み上げを停止できます。 例:`@hanako 沈黙 @Ebycow`',
                'error'
            );
        }

        // ページ会話レスポンス
        const pager = new Pager(this.hanako.silenceDictionary);
        return input.newChatResponse(pager.show(), 'pager');
    }
}

module.exports = SilenceReadCommand;

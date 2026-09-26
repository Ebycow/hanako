const path = require('path');
const logger = require('log4js').getLogger(path.basename(__filename));
const assert = require('assert').strict;

/** @typedef {import('./index').SlashCommandDefinition} SlashCommandDefinition */
/** @typedef {import('../../entity/command_input')} CommandInput */
/** @typedef {import('../../entity/responses').ResponseT} ResponseT */

/**
 * ドメインモデル
 * askコマンド
 */
class HelpCommand {
    /**
     * @type {'help'}
     */
    get type() {
        return 'help';
    }

    /**
     * @type {string[]}
     */
    static get names() {
        return ['使い方', 'help'];
    }

    /**
     * スラッシュコマンドの定義
     *
     * @type {SlashCommandDefinition}
     */
    static get slash() {
        return {
            name: 'help',
            description: 'コマンド一覧と使い方を表示します',
            ephemeral: true,
            options: [],
        };
    }

    /**
     * askコマンドを処理
     *
     * @param {CommandInput} input コマンド引数
     * @returns {ResponseT} レスポンス
     */
    process(input) {
        assert(typeof input === 'object');
        logger.info(`helpを受理 ${input}`);
        return input.newChatResponse(
            'コマンド一覧と使い方はこちらに記載されています: https://github.com/Ebycow/hanako/blob/master/README.md'
        );
    }
}

module.exports = HelpCommand;

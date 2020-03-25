const path = require('path');
const logger = require('log4js').getLogger(path.basename(__filename));
const assert = require('assert').strict;

/** @typedef {import('../../entities/command_input')} CommandInput */
/** @typedef {import('../../entities/responses').ResponseT} ResponseT */

/**
 * ドメインモデル
 * askコマンド
 */
class AskCommand {
    /**
     * @type {'ask'}
     */
    get type() {
        return 'ask';
    }

    /**
     * @type {string[]}
     */
    static get names() {
        return ['質問', 'ask'];
    }

    /**
     * askコマンドを処理
     *
     * @param {CommandInput} input コマンド引数
     * @returns {ResponseT} レスポンス
     */
    process(input) {
        assert(typeof input === 'object');
        logger.info(`askを受理 ${input}`);

        if (Math.random() >= 0.5) {
            return input.newChatResponse('はい');
        } else {
            return input.newChatResponse('いいえ');
        }
    }
}

module.exports = AskCommand;

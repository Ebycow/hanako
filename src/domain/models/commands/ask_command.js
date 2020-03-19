const path = require('path');
const logger = require('log4js').getLogger(path.basename(__filename));
const assert = require('assert').strict;
const TextResponse = require('../../entities/responses/text_response');

/**
 * ドメインモデル
 * askコマンド
 */
class AskCommand {
    /**
     * @returns {'ask'}
     */
    get type() {
        return 'ask';
    }

    /**
     * @returns {string[]}
     */
    static get names() {
        // TODO FIXME
        return ['ask', 'satomi', 'shitsu-mon'];
    }

    /**
     * askコマンドを処理
     *
     * @param {import('../../entities/command_input')} input コマンド引数
     * @returns {import('../../entities/responses/response')} レスポンス
     */
    process(input) {
        assert(typeof input === 'object');
        logger.info(`askを受信 ${input}`);

        if (Math.random() >= 0.5) {
            return new TextResponse({ content: 'はい' });
        } else {
            return new TextResponse({ content: 'いいえ' });
        }
    }
}

module.exports = AskCommand;

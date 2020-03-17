const path = require('path');
const logger = require('log4js').getLogger(path.basename(__filename));
const assert = require('assert').strict;

/**
 * @typedef MessageValidatorData
 * @type {object}
 *
 * @property {boolean} isBot
 * @property {boolean} isHanako
 * @property {string} content
 * @property {string} userName
 * @property {'text'|'dm'} channelType
 */

/**
 * アプリケーションサービス
 * メッセージの基本バリデーション
 */
class MessageValidator {
    constructor() {}

    /**
     * メッセージの基本バリデーション
     * @param {MessageValidatorData} data
     */
    async validate(data) {
        assert(typeof data.isBot === 'boolean');
        assert(typeof data.isHanako === 'boolean');
        assert(typeof data.content === 'string');
        assert(typeof data.userName === 'string');
        assert(data.channelType === 'text' || data.channelType === 'dm');

        if (data.isBot && !data.isHanako) {
            // 花子以外のBotは常に無視
            logger.trace(`${data.userName}はBotなので無視した`);
            // TODO FIX errortype
            return Promise.reject(0);
        }
        if (data.content === '') {
            // 空のメッセージは無視（ファイル添付時の挙動）
            logger.trace(`${data.userName}の空のメッセージを無視した`);
            // TODO FIX errortype
            return Promise.reject(0);
        }
        if (data.channelType === 'dm') {
            // DMは無視
            logger.trace(`${data.userName}からのDMを無視した ${data.content}`);
            // TODO FIX errortype
            return Promise.reject(0);
        }

        return Promise.resolve();
    }
}

module.exports = MessageValidator;

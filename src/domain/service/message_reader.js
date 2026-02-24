const path = require('path');
const logger = require('log4js').getLogger(path.basename(__filename));
const assert = require('assert').strict;
const errors = require('../../core/errors').promises;
const utils = require('../../core/utils');
const Formato = require('../model/formato');
const Reado = require('../model/reado');

/** @typedef {import('../model/hanako')} Hanako */
/** @typedef {import('../entity/discord_message')} DiscordMessage */
/** @typedef {import('../entity/audios').AudioT} AudioT */

/**
 * ドメインサービス
 * Discordメッセージの読み上げ
 */
class MessageReader {
    /**
     * 渡された読み上げ花子の環境下で音声読み上げを実行
     * - 読み上げられないとき errors.abort
     *
     * @param {Hanako} hanako 読み上げ花子モデル
     * @param {DiscordMessage} dmessage 読み上げるDiscordメッセージ
     * @returns {Promise<Array<AudioT>>} 音声読み上げ手続きの配列
     */
    async read(hanako, dmessage) {
        assert(typeof hanako === 'object');
        assert(typeof dmessage === 'object');
        assert(dmessage.type === 'read');

        // Silence中のユーザーは読み上げない
        if (hanako.silenceDictionary.lines.some(line => line.userId === dmessage.userId)) {
            logger.trace(`読み上げ停止中のユーザーなので読み上げを中止する ${dmessage}`);
            return errors.abort();
        }

        // 各Formatterによる読み上げ文字列の正規化を実行
        const formato = new Formato(hanako);
        const text = formato.normalize(dmessage.content);

        if (utils.countUnicode(text) === 0) {
            logger.info(`正規化後の文字列が空なので読み上げを中止する ${dmessage}`);
            return errors.abort();
        }

        // 各Readerによる読み上げ手続き変換を実行
        const reado = new Reado(hanako, dmessage);
        const audios = reado.compose(text);

        if (audios.length === 0) {
            logger.info(`変換後の読み上げ手続きが空なので読み上げを中止する ${text} ${dmessage}`);
            return errors.abort();
        }

        return Promise.resolve(audios);
    }
}

module.exports = MessageReader;

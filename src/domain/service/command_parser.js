const path = require('path');
const logger = require('log4js').getLogger(path.basename(__filename));
const assert = require('assert').strict;
const errors = require('../../core/errors').promises;
const CommandInput = require('../entity/command_input');

/** @typedef {import('../entity/discord_message')} DiscordMessage */
/** @typedef {import('../entity/responses').ResponseT} ResponseT */
/** @typedef {import('../model/hanako')} Hanako */

/**
 * ドメインサービス
 * Discordメッセージをパースしてコマンド引数に
 */
class CommandParser {
    /**
     * 渡された読み上げ花子の環境下でDiscordメッセージをパース
     * - パースできない時 errors.abort
     *
     * @param {Hanako} hanako 読み上げ花子モデル
     * @param {DiscordMessage} dmessage Discordメッセージ
     * @returns {Promise<CommandInput>} パースされたコマンド引数
     */
    async parse(hanako, dmessage) {
        assert(typeof hanako === 'object');
        assert(typeof dmessage === 'object');
        assert(dmessage.type === 'command');

        // Note: 全角スペースをマッチさせるためESLintを黙らせる
        // eslint-disable-next-line no-irregular-whitespace
        let parts = dmessage.content.split(/[\s　]+/);

        // コマンド指定形式を判定
        if (parts[0].startsWith('@')) {
            // "@hanako ask" 形式
            parts = parts.slice(1);
        } else if (parts[0].startsWith(hanako.prefix)) {
            // ">ask" 形式
            parts[0] = parts[0].slice(hanako.prefix.length);
        } else {
            logger.info(`コマンド指定形式が見つからない ${dmessage}`);
            return errors.abort();
        }

        // 空白が含まれていないこと
        if (!parts.every(x => x.length > 0)) {
            logger.info(`コマンド引数のパースに失敗 ${dmessage}`);
            return errors.abort();
        }

        // コマンド引数を生成して返却
        const commandInput = new CommandInput({ id: dmessage.id, argc: parts.length, argv: parts, origin: dmessage });
        return Promise.resolve(commandInput);
    }
}

module.exports = CommandParser;

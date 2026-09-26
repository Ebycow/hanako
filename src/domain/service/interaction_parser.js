const assert = require('assert').strict;
const CommandInput = require('../entity/command_input');

/** @typedef {import('../entity/discord_message')} DiscordMessage */
/** @typedef {import('../model/hanako')} Hanako */

/**
 * ドメインサービス
 * スラッシュコマンドをコマンド引数に
 */
class InteractionParser {
    /**
     * スラッシュコマンドのメッセージをコマンド引数にする
     * - 引数は文字列に戻さず、オプションから作った名前付きの引数をそのまま渡す
     *
     * @param {Hanako} hanako 読み上げ花子モデル
     * @param {DiscordMessage} dmessage スラッシュコマンドのメッセージ（contentはスラッシュコマンド名）
     * @returns {Promise<CommandInput>} コマンド引数（argvはスラッシュコマンド名だけ）
     */
    async parse(hanako, dmessage) {
        assert(typeof hanako === 'object');
        assert(typeof dmessage === 'object');
        assert(dmessage.type === 'interaction');

        const commandInput = new CommandInput({
            id: dmessage.id,
            argc: 1,
            argv: [dmessage.content],
            origin: dmessage,
            args: dmessage.commandArgs,
        });
        return Promise.resolve(commandInput);
    }
}

module.exports = InteractionParser;

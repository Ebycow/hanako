const path = require('path');
const logger = require('log4js').getLogger(path.basename(__filename));
const assert = require('assert').strict;
const errors = require('../../core/errors').promises;
const Commando = require('../model/commando');

/** @typedef {import('../entity/command_input')} CommandInput */
/** @typedef {import('../entity/responses').ResponseT} ResponseT */
/** @typedef {import('../model/hanako')} Hanako */
/** @typedef {import('../model/commands').CommandT} CommandT */

/**
 * ドメインサービス
 * コマンド引数でコマンドを実行
 */
class CommandInvoker {
    /**
     * 渡された読み上げ花子の実行環境下でコマンドを実行
     * - 引数で指定されたコマンドが見つからない時 errors.abort
     *
     * @param {Hanako} hanako 読み上げ花子モデル
     * @param {CommandInput} commandInput コマンド引数
     * @returns {Promise<ResponseT>} 実行結果
     */
    async invoke(hanako, commandInput) {
        assert(typeof hanako === 'object');
        assert(typeof commandInput === 'object');

        // コマンドーモデルを構築
        const commando = new Commando(hanako);

        // 引数に対応するコマンドを取得
        const [command, input] = commando.resolve(commandInput);
        if (!command) {
            // Note: 利用者は「>」+ 文章で投稿して読み上げを回避する使い方をしている。
            //       未知のコマンドは読み上げにフォールバックせず黙って abort することで、この用途が成り立つ。
            logger.trace(`コマンドが見当たらない ${input}`);
            return errors.abort();
        }

        // テキストの引数を名前付きの引数に変換（形式が間違っていればその案内を返す）
        const parsed = parseArgsF(command, input);
        if (parsed.response) {
            return Promise.resolve(parsed.response);
        }

        // TODO: 実行者の権限チェックが未実装（誰でも全コマンドを実行できる）。テキスト/スラッシュ両方に効く方式を要検討
        // コマンドを実行
        const response = command.process(input.withArgs(parsed.args));

        // レスポンスを返す
        return Promise.resolve(response);
    }
}

/**
 * (private) コマンドの引数を名前付きの引数に変換する
 * - 引数を取らないコマンドは parseText を持たない
 *
 * @param {CommandT} command 実行するコマンド
 * @param {CommandInput} input コマンド名を消費済みのコマンド引数
 * @returns {{args: object}|{response: ResponseT}} 名前付きの引数、または形式エラーのレスポンス
 */
function parseArgsF(command, input) {
    const K = command.constructor;
    if (typeof K.parseText !== 'function') {
        return { args: {} };
    }
    return K.parseText(input);
}

module.exports = CommandInvoker;

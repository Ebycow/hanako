const path = require('path');
const logger = require('log4js').getLogger(path.basename(__filename));
const assert = require('assert').strict;
const errors = require('../../core/errors').promises;
const Commando = require('../model/commando');

/** @typedef {import('../entity/command_input')} CommandInput */
/** @typedef {import('../entity/responses').ResponseT} ResponseT */
/** @typedef {import('../model/hanako')} Hanako */

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
            logger.info(`コマンドが見当たらない ${input}`);
            return errors.abort();
        }

        // コマンドを実行
        const response = command.process(input);

        // レスポンスを返す
        return Promise.resolve(response);
    }
}

module.exports = CommandInvoker;

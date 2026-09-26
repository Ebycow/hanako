const path = require('path');
const logger = require('log4js').getLogger(path.basename(__filename));
const assert = require('assert').strict;
const errors = require('../../core/errors').promises;
const Commando = require('../model/commando');
const PERMISSION_LABELS = require('../model/permission_labels');

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

        // コマンドを実行
        const response =
            commandInput.source === 'slash'
                ? invokeSlashF(commando, commandInput)
                : invokeTextF(commando, commandInput);

        // レスポンスを返す
        return Promise.resolve(response);
    }
}

/**
 * (private) テキストで入力されたコマンドを実行する
 *
 * @param {Commando} commando コマンドーモデル
 * @param {CommandInput} commandInput コマンド引数
 * @returns {Promise<ResponseT>} 実行結果
 */
function invokeTextF(commando, commandInput) {
    // 引数に対応するコマンドを取得
    const [command, input] = commando.resolve(commandInput);
    if (!command) {
        // Note: 利用者は「>」+ 文章で投稿して読み上げを回避する使い方をしている。
        //       未知のコマンドは読み上げにフォールバックせず黙って abort することで、この用途が成り立つ。
        logger.trace(`コマンドが見当たらない ${input}`);
        return errors.abort();
    }

    // 実行に必要な権限を確認する
    // Note: スラッシュコマンドはDiscordが登録時の初期値（または管理者が連携サービスで変えた設定）で弾くが、
    //       テキストには届かないので、同じ初期値の権限をこちらで確認する。
    //       連携サービスでの上書きは反映されないため、管理者が初期値より広げた場合はテキストの方が厳しく、
    //       狭めた場合（特定のロールやチャンネルに限定など）はテキストの方が緩くなる。
    //       連携サービスの設定をそのまま効かせたいサーバーは、テキストコマンドを無効にする。
    const K = command.constructor;
    if (K.requiredPermission && !input.memberPermissions.includes(K.requiredPermission)) {
        logger.info(`権限がないためコマンドを実行しない ${input}`);
        const label = PERMISSION_LABELS[K.requiredPermission];
        return Promise.resolve(
            input.newChatResponse(`このコマンドは「${label}」の権限を持っている人だけが使えるよ :lock:`, 'error')
        );
    }

    // テキストの引数を名前付きの引数に変換（形式が間違っていればその案内を返す）
    // Note: 引数を取らないコマンドは parseText を持たない
    const parsed = typeof K.parseText === 'function' ? K.parseText(input) : { args: {} };
    if (parsed.response) {
        return Promise.resolve(parsed.response);
    }

    return Promise.resolve(command.process(input.withArgs(parsed.args)));
}

/**
 * (private) スラッシュコマンドを実行する
 * - 引数はDiscordがオプションの型と必須を保証しているので、名前付きの引数のまま渡す
 *
 * @param {Commando} commando コマンドーモデル
 * @param {CommandInput} commandInput コマンド引数（argv[0]がスラッシュコマンド名）
 * @returns {Promise<ResponseT>} 実行結果
 */
function invokeSlashF(commando, commandInput) {
    const command = commando.resolveSlash(commandInput.argv[0]);
    if (!command) {
        // Note: 登録済みのスラッシュコマンドがBotの更新で消えた場合など
        logger.warn(`スラッシュコマンドが見当たらない ${commandInput}`);
        return errors.abort();
    }

    return Promise.resolve(command.process(commandInput));
}

module.exports = CommandInvoker;

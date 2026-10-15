const path = require('path');
const logger = require('log4js').getLogger(path.basename(__filename));
const assert = require('assert').strict;
const PERMISSION_LABELS = require('../permission_labels');

/** @typedef {import('./index').SlashCommandDefinition} SlashCommandDefinition */
/** @typedef {import('../../entity/command_input')} CommandInput */
/** @typedef {import('../../entity/responses').ResponseT} ResponseT */
/** @typedef {import('../../model/hanako')} Hanako */

/**
 * スラッシュコマンドを持つコマンドクラスの一覧
 * Note: commands/index.js がこのファイルを読み込むので、循環しないよう使うときに読み込む
 *
 * @returns {Function[]} コマンドクラスの配列
 */
function commandClasses() {
    return Object.values(require('./index')).filter((K) => K.slash);
}

/**
 * ドメインモデル
 * helpコマンド
 */
class HelpCommand {
    /**
     * @param {Hanako} hanako コマンド実行下の読み上げ花子
     */
    constructor(hanako) {
        this.hanako = hanako;
    }

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
            options: [
                {
                    type: 'string',
                    name: 'command',
                    description: '使い方を知りたいコマンド（例: limit）',
                    required: false,
                    autocomplete: true,
                },
            ],
        };
    }

    /**
     * テキストで入力された引数を名前付きの引数に変換
     * Note: コマンドの解決と同じく、空白で区切られた名前は「-」でつなぐ（例: `help se add` → se-add）
     *
     * @param {CommandInput} input コマンド引数
     * @returns {{args: {command?: string}}} 名前付きの引数
     */
    static parseText(input) {
        return { args: input.argc > 0 ? { command: input.argv.join('-') } : {} };
    }

    /**
     * 名前からコマンドクラスを探す
     * スラッシュコマンド名とテキストでの名前のどちらでも探せる（先頭の「/」や「>」は無視する）
     *
     * @param {string} name コマンド名
     * @returns {?Function} コマンドクラス（見つからない場合はnull）
     */
    static findCommand(name) {
        assert(typeof name === 'string');
        const key = name.trim().replace(/^[/>]/, '').toLowerCase();
        const classes = commandClasses();
        return (
            classes.find((K) => K.slash.name === key) ||
            classes.find((K) => K.names.some((n) => n.toLowerCase() === key)) ||
            null
        );
    }

    /**
     * 入力中の文字列に合うコマンドを探す（自動補完の候補に使う）
     * 空なら全てのコマンドを返す
     *
     * @param {string} text 入力中の文字列
     * @returns {Function[]} コマンドクラスの配列
     */
    static searchCommands(text) {
        assert(typeof text === 'string');
        const key = text.trim().replace(/^[/>]/, '').toLowerCase();
        return commandClasses().filter(
            (K) =>
                K.slash.name.includes(key) ||
                K.names.some((n) => n.toLowerCase().includes(key)) ||
                K.slash.description.includes(key)
        );
    }

    /**
     * helpコマンドを処理
     *
     * @param {CommandInput} input コマンド引数
     * @returns {ResponseT} レスポンス
     */
    process(input) {
        assert(typeof input === 'object');
        logger.info(`helpを受理 ${input}`);

        const name = input.args.command;
        if (!name) {
            return input.newChatResponse(this.withHelpUrl(this.listText(input)));
        }

        const K = HelpCommand.findCommand(name);
        if (!K) {
            const usage = input.usage('`@hanako help`', '`/help`');
            return input.newChatResponse(
                `「${name}」というコマンドは見つからなかったよ :sob: ${usage} でコマンドの一覧を見られるよ`,
                'error'
            );
        }
        return input.newChatResponse(this.withHelpUrl(this.detailText(K)));
    }

    /**
     * コマンド一覧の本文
     *
     * @param {CommandInput} input コマンド引数
     * @returns {string}
     */
    listText(input) {
        const lines = commandClasses().map((K) => {
            const permission = K.requiredPermission ? ` :lock:${PERMISSION_LABELS[K.requiredPermission]}` : '';
            return `\`/${K.slash.name}\` ${K.slash.description}${permission}`;
        });
        const usage = input.usage('`@hanako help コマンド名`', '`/help command:コマンド名`');
        return ['**コマンド一覧**', ...lines, '', `${usage} でコマンドごとの使い方を表示します`].join('\n');
    }

    /**
     * コマンドの使い方の本文
     *
     * @param {Function} K コマンドクラス
     * @returns {string}
     */
    detailText(K) {
        const lines = [`**/${K.slash.name}** ${K.slash.description}`];

        if (K.slash.options.length > 0) {
            lines.push('', 'オプション');
            K.slash.options.forEach((o) => {
                const optional = o.required ? '' : '（省略可）';
                lines.push(`・\`${o.name}\` ${o.description}${optional}`);
            });
        }

        lines.push('');
        if (K.requiredPermission) {
            lines.push(`使える人: 「${PERMISSION_LABELS[K.requiredPermission]}」の権限を持っている人`);
        } else {
            lines.push('使える人: 全員');
        }

        // テキストコマンドを無効にしているサーバーでは、テキストでの書き方は案内しない
        if (K.names.length === 0) {
            lines.push('テキストでの書き方: なし（スラッシュコマンドのみ）');
        } else if (this.hanako.settings.textCommands) {
            const [name, ...aliases] = K.names;
            const others = aliases.length > 0 ? `（別名: ${aliases.join(', ')}）` : '';
            lines.push(`テキストでの書き方: \`@hanako ${name}\` \`${this.hanako.prefix}${name}\`${others}`);
        }

        return lines.join('\n');
    }

    /**
     * 使い方のページの案内を付ける（URLが設定されていなければそのまま）
     *
     * @param {string} text 本文
     * @returns {string}
     */
    withHelpUrl(text) {
        const url = this.hanako.helpUrl;
        return url ? `${text}\n詳しくはこちら: <${url}>` : text;
    }
}

module.exports = HelpCommand;

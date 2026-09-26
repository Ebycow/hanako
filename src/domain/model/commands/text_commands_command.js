const path = require('path');
const logger = require('log4js').getLogger(path.basename(__filename));
const assert = require('assert').strict;
const TextCommandsUpdateAction = require('../../entity/actions/text_commands_update_action');
const ActionResponse = require('../../entity/responses/action_response');

/** @typedef {import('./index').PermissionName} PermissionName */
/** @typedef {import('./index').SlashCommandDefinition} SlashCommandDefinition */
/** @typedef {import('../../entity/command_input')} CommandInput */
/** @typedef {import('../../entity/responses').ResponseT} ResponseT */
/** @typedef {import('../../model/hanako')} Hanako */

/**
 * ドメインモデル
 * テキストコマンド（@hanako や > で始まるコマンド）の有効・無効を切り替えるコマンド
 *
 * 無効にすると、テキストで送られたコマンドは実行せず黙って無視する。
 * 連携サービスでコマンドを使える人を細かく決めたサーバーは、テキストからその設定を迂回されないよう無効にする。
 * Note: テキストから切り替えられると抜け道になるため、スラッシュコマンドでだけ実行できる
 */
class TextCommandsCommand {
    /**
     * @type {'text_commands'}
     */
    get type() {
        return 'text_commands';
    }

    /**
     * テキストからは実行させないため、テキストのコマンド名は持たない
     *
     * @type {string[]}
     */
    static get names() {
        return [];
    }

    /**
     * 実行に必要な権限（スラッシュコマンドの初期値と、テキストで実行されたときの確認に使う）
     *
     * @type {PermissionName}
     */
    static get requiredPermission() {
        return 'manageGuild';
    }

    /**
     * スラッシュコマンドの定義
     *
     * @type {SlashCommandDefinition}
     */
    static get slash() {
        return {
            name: 'text-commands',
            description: '「@はなこ」や「>」で始まるテキストのコマンドを使えるようにするか設定します',
            options: [
                {
                    type: 'boolean',
                    name: 'enabled',
                    description: 'テキストのコマンドを使えるようにするなら True',
                    required: true,
                },
            ],
        };
    }

    /**
     * @param {Hanako} hanako コマンド実行下の読み上げ花子
     */
    constructor(hanako) {
        this.hanako = hanako;
    }

    /**
     * テキストコマンドの有効・無効を切り替えるコマンドを処理
     *
     * @param {CommandInput} input コマンド引数
     * @returns {ResponseT} レスポンス
     */
    process(input) {
        assert(typeof input === 'object');
        logger.info(`テキストコマンド設定コマンドを受理 ${input}`);

        const enabled = input.args.enabled;
        const action = new TextCommandsUpdateAction({
            id: input.id,
            serverId: input.serverId,
            enabled,
        });
        const onSuccess = input.newChatResponse(
            enabled
                ? '「@はなこ」や「>」で始まるテキストのコマンドを使えるようにしました :keyboard:'
                : '「@はなこ」や「>」で始まるテキストのコマンドを使えないようにしました。コマンドはスラッシュコマンドで使ってね :keyboard:'
        );
        return new ActionResponse({ id: input.id, action, onSuccess });
    }
}

module.exports = TextCommandsCommand;

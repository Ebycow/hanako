const path = require('path');
const logger = require('log4js').getLogger(path.basename(__filename));
const assert = require('assert').strict;
const SilenceDeleteAction = require('../../entity/actions/silence_delete_action');
const ActionResponse = require('../../entity/responses/action_response');

/** @typedef {import('../../entity/command_input')} CommandInput */
/** @typedef {import('../../entity/responses').ResponseT} ResponseT */
/** @typedef {import('../../model/hanako')} Hanako */

/**
 * ドメインモデル
 * 沈黙ユーザー削除コマンド
 */
class SilenceDeleteCommand {
    /**
     * @type {'silence_delete'}
     */
    get type() {
        return 'silence_delete';
    }

    /**
     * @type {string[]}
     */
    static get names() {
        return ['恩赦', 'blacklist-remove'];
    }

    /**
     * @param {Hanako} hanako コマンド実行下の読み上げ花子
     */
    constructor(hanako) {
        this.hanako = hanako;
    }

    /**
     * 沈黙ユーザー削除コマンドを処理
     *
     * @param {CommandInput} input コマンド引数
     * @returns {ResponseT} レスポンス
     */
    process(input) {
        assert(typeof input === 'object');
        logger.info(`沈黙ユーザー削除コマンドを受理 ${input}`);

        // コマンド形式のバリデーション
        // Note: 引数がちょうど1つ ∧ 引数がアットマークで始まる
        if (input.argc !== 1 || !input.argv[0].startsWith('@')) {
            return input.newChatResponse('コマンドの形式が間違っています :sob: 例:`@hanako 恩赦 @Ebycow`', 'error');
        }

        const username = input.argv[0].slice(1);

        // Note: サーバー外のユーザーをDiscordタグ直打ち等でメンションされると解決できない
        //       またはユーザーではなくロールにメンションした場合
        if (!input.mentionedUsers.has(username)) {
            return input.newChatResponse('そんな人いる？ :thinking:', 'error');
        }

        const userId = input.mentionedUsers.get(username);
        const silence = this.hanako.silenceDictionary.lines.find(line => line.userId === userId);

        // ユーザーが登録されていない
        if (!silence) {
            return input.newChatResponse('そのユーザはしっかりと読み上げています', 'error');
        }

        // 沈黙ユーザー削除アクションを作成
        const action = new SilenceDeleteAction({
            id: input.id,
            serverId: input.serverId,
            silenceId: silence.id,
        });
        const onSuccess = input.newChatResponse(`${username} ごめんね、またおはなししてね :bulb:`);
        return new ActionResponse({ id: input.id, action, onSuccess });
    }
}

module.exports = SilenceDeleteCommand;

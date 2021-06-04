const path = require('path');
const logger = require('log4js').getLogger(path.basename(__filename));
const assert = require('assert').strict;
const SilenceCreateAction = require('../../entity/actions/silence_create_action');
const ActionResponse = require('../../entity/responses/action_response');

/** @typedef {import('../../entity/command_input')} CommandInput */
/** @typedef {import('../../entity/responses').ResponseT} ResponseT */
/** @typedef {import('../../model/hanako')} Hanako */

/**
 * ドメインモデル
 * 沈黙ユーザー追加コマンド
 */
class SilenceCreateCommand {
    /**
     * @type {'silence_create'}
     */
    get type() {
        return 'silence_create';
    }

    /**
     * @type {string[]}
     */
    static get names() {
        return ['沈黙', 'blacklist-add'];
    }

    /**
     * @param {Hanako} hanako コマンド実行下の読み上げ花子
     */
    constructor(hanako) {
        this.hanako = hanako;
    }

    /**
     * 沈黙ユーザー追加コマンドを処理
     *
     * @param {CommandInput} input コマンド引数
     * @returns {ResponseT} レスポンス
     */
    process(input) {
        assert(typeof input === 'object');
        logger.info(`沈黙ユーザー追加コマンドを受理 ${input}`);

        // コマンド形式のバリデーション
        // Note: 引数がちょうど1つ ∧ 引数がアットマークで始まる
        if (input.argc !== 1 || !input.argv[0].startsWith('@')) {
            return input.newChatResponse('コマンドの形式が間違っています :sob: 例:`@hanako 沈黙 @Ebycow`', 'error');
        }

        const username = input.argv[0].slice(1);

        // Note: サーバー外のユーザーをDiscordタグ直打ち等でメンションされると解決できない
        //       またはユーザーではなくロールにメンションした場合
        if (!input.mentionedUsers.has(username)) {
            return input.newChatResponse('そんな人いる？ :thinking:', 'error');
        }

        const userId = input.mentionedUsers.get(username);

        // 重複チェック
        const dup = this.hanako.silenceDictionary.lines.find(line => line.userId === userId);
        if (dup) {
            const month = dup.createdAt.getMonth() + 1;
            return input.newChatResponse(
                `すでに読み上げ停止中のユーザーです（${dup.createdAt.getFullYear()}年${month}月${dup.createdAt.getDate()}日から現在まで）`,
                'error'
            );
        }

        // 上限数チェック
        // if (this.hanako.wordDictionary.lines.length >= 30) {
        //     return input.newChatResponse(
        //         'すでに上限数(30)のユーザーが登録されています。何名か解除してから再度試してください。',
        //         'error'
        //     );
        // }

        // 沈黙ユーザー追加アクションを作成
        const action = new SilenceCreateAction({
            id: input.id,
            serverId: input.serverId,
            userId,
        });
        const onSuccess = input.newChatResponse(`${username} 静かにして！！！ :bulb:`);
        return new ActionResponse({ id: input.id, action, onSuccess });
    }
}

module.exports = SilenceCreateCommand;

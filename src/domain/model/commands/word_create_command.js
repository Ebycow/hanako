const path = require('path');
const logger = require('log4js').getLogger(path.basename(__filename));
const assert = require('assert').strict;
const WordCreateAction = require('../../entity/actions/word_create_action');
const ActionResponse = require('../../entity/responses/action_response');

/** @typedef {import('../../entity/command_input')} CommandInput */
/** @typedef {import('../../entity/responses').ResponseT} ResponseT */
/** @typedef {import('../../model/hanako')} Hanako */

/**
 * ドメインモデル
 * 教育単語追加コマンド
 */
class WordCreateCommand {
    /**
     * @type {'word_create'}
     */
    get type() {
        return 'word_create';
    }

    /**
     * @type {string[]}
     */
    static get names() {
        return ['教育', 'teach', 'mk', 'wbook-add'];
    }

    /**
     * @param {Hanako} hanako コマンド実行下の読み上げ花子
     */
    constructor(hanako) {
        this.hanako = hanako;
    }

    /**
     * 教育単語追加コマンドを処理
     *
     * @param {CommandInput} input コマンド引数
     * @returns {ResponseT} レスポンス
     */
    process(input) {
        assert(typeof input === 'object');
        logger.info(`教育単語追加コマンドを受理 ${input}`);

        // コマンド形式のバリデーション
        if (input.argc !== 2) {
            return input.newChatResponse('コマンドの形式が間違っています :sob: 例:`@hanako 教育 電 いなづま`', 'error');
        }

        const from = input.argv[0];
        const to = input.argv[1];

        // 文字数下限のバリデーション
        if (from.length < 2 || to.length < 2) {
            return input.newChatResponse('一文字教育はできないよ', 'error');
        }

        // 文字数上限のバリデーション
        if (from.length > 50 || to.length > 50) {
            return input.newChatResponse('もじながすぎわろたwwww 50文字以上の教育はできません', 'error');
        }

        // 重複チェック
        const dup = this.hanako.wordDictionary.lines.find(line => line.from === from);
        if (dup) {
            return input.newChatResponse(`すでに教育済みの単語です！ 『${dup.from} ⇨ ${dup.to}』`, 'error');
        }

        // 上限数チェック
        if (this.hanako.wordDictionary.lines.length >= 200) {
            return input.newChatResponse(
                'すでに上限数(200)の単語が登録されています。何か削除してから再度試してください。',
                'error'
            );
        }

        // 教育単語追加アクションを作成
        const action = new WordCreateAction({
            id: input.id,
            serverId: input.serverId,
            from,
            to,
        });
        const onSuccess = input.newChatResponse(`覚えました！ 『${from} ⇨ ${to}』 :bulb:`);
        return new ActionResponse({ id: input.id, action, onSuccess });
    }
}

module.exports = WordCreateCommand;

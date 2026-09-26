const path = require('path');
const logger = require('log4js').getLogger(path.basename(__filename));
const assert = require('assert').strict;
const utils = require('../../../core/utils');
const FoleyRenameAction = require('../../entity/actions/foley_rename_action');
const ActionResponse = require('../../entity/responses/action_response');

/** @typedef {import('./index').SlashCommandDefinition} SlashCommandDefinition */
/** @typedef {import('../../entity/command_input')} CommandInput */
/** @typedef {import('../../entity/responses').ResponseT} ResponseT */
/** @typedef {import('../../model/hanako')} Hanako */

/**
 * ドメインモデル
 * SE名置換コマンド
 */
class FoleyRenameCommand {
    /**
     * @type {'foley_rename'}
     */
    get type() {
        return 'foley_rename';
    }

    /**
     * @type {string[]}
     */
    static get names() {
        return ['音声名置換', 'se-rename'];
    }

    /**
     * スラッシュコマンドの定義
     *
     * @type {SlashCommandDefinition}
     */
    static get slash() {
        return {
            name: 'se-rename',
            description: 'SEのキーワードを変更します',
            options: [
                { type: 'string', name: 'old_keyword', description: '現在のキーワード', required: true },
                { type: 'string', name: 'new_keyword', description: '新しいキーワード', required: true },
            ],
        };
    }

    /**
     * テキストで入力された引数を名前付きの引数に変換
     *
     * @param {CommandInput} input コマンド引数
     * @returns {{args: {old_keyword: string, new_keyword: string}}|{response: ResponseT}} 名前付きの引数、または形式エラーのレスポンス
     */
    static parseText(input) {
        if (input.argc !== 2) {
            return {
                response: input.newChatResponse(
                    'コマンドの形式が間違っています :sob: 例:`@hanako 音声名置換 from to`',
                    'error'
                ),
            };
        }
        return { args: { old_keyword: input.argv[0], new_keyword: input.argv[1] } };
    }

    /**
     * @param {Hanako} hanako コマンド実行下の読み上げ花子
     */
    constructor(hanako) {
        this.hanako = hanako;
    }

    /**
     * SE追加コマンドを処理
     *
     * @param {CommandInput} input コマンド引数
     * @returns {ResponseT} レスポンス
     */
    process(input) {
        assert(typeof input === 'object');
        logger.info(`SE名置き換えコマンドを受理 ${input}`);

        const { old_keyword: keywordFrom, new_keyword: keywordTo } = input.args;

        // 存在チェック
        const exs = this.hanako.foleyDictionary.lines.find((line) => line.keyword === keywordFrom);
        if (exs === undefined) {
            return input.newChatResponse(`そのキーワードは存在しません･･･`, 'error');
        }

        // 存在チェック
        const dup = this.hanako.foleyDictionary.lines.find((line) => line.keyword === keywordTo);
        if (dup) {
            return input.newChatResponse(`そのキーワードはすでに存在しています･･･`, 'error');
        }

        // 文字数下限のバリデーション
        if (utils.countUnicode(keywordTo) < 2) {
            return input.newChatResponse('一文字登録はできないよ', 'error');
        }

        // 文字数上限のバリデーション
        if (utils.countUnicode(keywordTo) >= 50) {
            return input.newChatResponse('もじながすぎわろたwwww 50文字以上の教育はできません', 'error');
        }

        // SE追加アクションを作成
        const action = new FoleyRenameAction({
            id: input.id,
            serverId: input.serverId,
            keywordFrom: keywordFrom,
            keywordTo: keywordTo,
        });
        const onSuccess = input.newChatResponse(`変更しました！ 『${keywordFrom} => ${keywordTo}』 :bulb:`);
        const onFailure = input.newChatResponse('SE名変更中にエラーが発生しました :sob:', 'error');
        return new ActionResponse({ id: input.id, action, onSuccess, onFailure });
    }
}

module.exports = FoleyRenameCommand;

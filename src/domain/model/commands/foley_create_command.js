const path = require('path');
const logger = require('log4js').getLogger(path.basename(__filename));
const assert = require('assert').strict;
const utils = require('../../../core/utils');
const FoleyCreateAction = require('../../entity/actions/foley_create_action');
const ActionResponse = require('../../entity/responses/action_response');

/** @typedef {import('../../entity/command_input')} CommandInput */
/** @typedef {import('../../entity/responses').ResponseT} ResponseT */
/** @typedef {import('../../model/hanako')} Hanako */

/**
 * ドメインモデル
 * SE追加コマンド
 */
class FoleyCreateCommand {
    /**
     * @type {'foley_create'}
     */
    get type() {
        return 'foley_create';
    }

    /**
     * @type {string[]}
     */
    static get names() {
        return ['音声教育', 'se-add'];
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
        logger.info(`SE追加コマンドを受理 ${input}`);

        // コマンド形式のバリデーション
        if (input.argc !== 2) {
            return input.newChatResponse(
                'コマンドの形式が間違っています :sob: 例:`@hanako 音声教育 ﾀﾋﾟｵｶｳﾒｽ https://upload.ebycow.com/dirty-of-loudness.mp3`',
                'error'
            );
        }

        const keyword = input.argv[0];
        const url = input.argv[1];

        // 文字数下限のバリデーション
        if (utils.countUnicode(keyword) < 2) {
            return input.newChatResponse('一文字登録はできないよ', 'error');
        }

        // 文字数上限のバリデーション
        if (utils.countUnicode(keyword) >= 50) {
            return input.newChatResponse('もじながすぎわろたwwww 50文字以上の教育はできません', 'error');
        }

        // URL長さのバリデーション
        if (utils.countUnicode(url) > 300) {
            return input.newChatResponse('URLは300文字以内でお願いします :sob:', 'error');
        }

        // URL形式のバリデーション
        if (utils.neutralizeUrls(url, '<#0>') !== '<#0>') {
            return input.newChatResponse('URLの形式が間違っています :sob:', 'error');
        }

        // 重複チェック
        const dup = this.hanako.foleyDictionary.lines.find(line => line.keyword === keyword);
        if (dup) {
            return input.newChatResponse(`すでに登録済みのキーワードです！ 『${dup.keyword}』`, 'error');
        }

        // 上限数チェック
        if (this.hanako.foleyDictionary.lines.length >= 100) {
            return input.newChatResponse(
                'すでに上限数(100)のSEが登録されています。何か削除してから再度試してください。',
                'error'
            );
        }

        // SE追加アクションを作成
        const action = new FoleyCreateAction({
            id: input.id,
            serverId: input.serverId,
            keyword,
            url,
        });
        const onSuccess = input.newChatResponse(`登録しました！ 『${keyword}』 :bulb:`);
        const onFailure = input.newChatResponse('SE登録中にエラーが発生しました :sob:', 'error');
        return new ActionResponse({ id: input.id, action, onSuccess, onFailure });
    }
}

module.exports = FoleyCreateCommand;

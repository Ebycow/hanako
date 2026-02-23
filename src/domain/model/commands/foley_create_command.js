const path = require('path');
const logger = require('log4js').getLogger(path.basename(__filename));
const assert = require('assert').strict;
const utils = require('../../../core/utils');
const FoleyCreateAction = require('../../entity/actions/foley_create_action');
const FoleyCreateMultipleAction = require('../../entity/actions/foley_create_multiple_action');
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

        // 添付ファイルがある場合の処理
        const attachments = input.attachments || [];
        const hasAttachment = attachments.length > 0;

        let keyword, url;

        if (hasAttachment) {
            // ファイル添付がある場合
            if (input.argc === 0) {
                // @hanako se-add だけで、複数ファイルに対応
                return this.processMultipleAttachments(input, attachments);
            } else if (input.argc === 1) {
                // @hanako se-add SEの名前 の形式で、添付ファイルをURLとして使用（単一ファイルのみ）
                if (attachments.length > 1) {
                    return input.newChatResponse('SE名を指定する場合は添付ファイルは1つにしてください :sob:', 'error');
                }
                keyword = input.argv[0];
                url = attachments[0].url;
            } else {
                return input.newChatResponse('ファイル添付時は引数は0個または1個（SE名）にしてください :sob:', 'error');
            }
        } else {
            // 従来のURL指定方式
            if (input.argc !== 2) {
                return input.newChatResponse(
                    'コマンドの形式が間違っています :sob: 例:`@hanako 音声教育 ﾀﾋﾟｵｶｳﾒｽ https://upload.ebycow.com/dirty-of-loudness.mp3`',
                    'error'
                );
            }

            keyword = input.argv[0];
            url = input.argv[1];
        }

        // 単一ファイルのバリデーション
        const validationError = this.validateKeywordAndUrl(keyword, url, !hasAttachment);
        if (validationError) {
            return input.newChatResponse(validationError, 'error');
        }

        // 重複チェック
        const dup = this.hanako.foleyDictionary.lines.find((line) => line.keyword === keyword);
        if (dup) {
            return input.newChatResponse(`すでに登録済みのキーワードです！ 『${dup.keyword}』`, 'error');
        }

        // 上限数チェック
        if (this.hanako.foleyDictionary.lines.length >= 10000) {
            return input.newChatResponse(
                'すでに上限数(10000)のSEが登録されています。何か削除してから再度試してください。',
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
        const onSuccess = input.newChatResponse(
            `登録しました！ 『${keyword}』 :bulb:\n取り消す場合は: @hanako se-del ${keyword}`
        );
        const onFailure = input.newChatResponse('SE登録中にエラーが発生しました :sob:', 'error');
        return new ActionResponse({ id: input.id, action, onSuccess, onFailure });
    }

    /**
     * 複数添付ファイルを処理
     *
     * @param {CommandInput} input コマンド引数
     * @param {Array<{name: string, url: string}>} attachments 添付ファイル配列
     * @returns {ResponseT} レスポンス
     */
    processMultipleAttachments(input, attachments) {
        const results = [];
        const errors = [];

        for (const attachment of attachments) {
            logger.info(`添付ファイル情報: name=${attachment.name}, url=${attachment.url}`);
            const keyword = attachment.name.replace(/\.[^/.]+$/, ''); // 拡張子を除去
            const url = attachment.url;

            // 各ファイルのバリデーション
            const validationError = this.validateKeywordAndUrl(keyword, url, false);
            if (validationError) {
                errors.push(`${attachment.name}: ${validationError}`);
                continue;
            }

            // 重複チェック
            const dup = this.hanako.foleyDictionary.lines.find((line) => line.keyword === keyword);
            if (dup) {
                errors.push(`${attachment.name}: すでに登録済みのキーワードです！ 『${dup.keyword}』`);
                continue;
            }

            // 上限数チェック（現在の登録数 + 成功予定数）
            if (this.hanako.foleyDictionary.lines.length + results.length >= 10000) {
                errors.push(`${attachment.name}: 上限数(10000)に達しているため登録できません`);
                continue;
            }

            results.push({ keyword, url, fileName: attachment.name });
        }

        // 結果をまとめてレスポンス作成
        if (results.length === 0) {
            return input.newChatResponse(`すべてのファイルでエラーが発生しました :sob:\n${errors.join('\n')}`, 'error');
        }

        // 複数SE追加アクションを作成
        const items = results.map((r) => ({ keyword: r.keyword, url: r.url }));
        const action = new FoleyCreateMultipleAction({
            id: input.id,
            serverId: input.serverId,
            items,
        });

        let successMessage;
        const successKeywords = results.map((r) => r.keyword);
        const undoCommand = `@hanako se-del ${successKeywords.join(' ')}`;

        if (errors.length > 0) {
            // 一部成功、一部失敗の場合
            const successNames = successKeywords.join('、');
            successMessage = `一部登録しました: ${successNames}\nエラー:\n${errors.join(
                '\n'
            )} :warning:\n取り消す場合は: ${undoCommand}`;
        } else {
            // 全成功の場合
            const successNames = successKeywords.join('、');
            successMessage = `${results.length}個のSEを登録しました！ 『${successNames}』 :bulb:\n取り消す場合は: ${undoCommand}`;
        }

        const onSuccess = input.newChatResponse(successMessage);
        const onFailure = input.newChatResponse('SE登録中にエラーが発生しました :sob:', 'error');
        return new ActionResponse({ id: input.id, action, onSuccess, onFailure });
    }

    /**
     * キーワードとURLのバリデーション
     *
     * @param {string} keyword キーワード
     * @param {string} url URL
     * @param {boolean} checkUrlFormat URL形式をチェックするかどうか
     * @returns {string|null} エラーメッセージまたはnull
     */
    validateKeywordAndUrl(keyword, url, checkUrlFormat = true) {
        // 文字数下限のバリデーション
        if (utils.countUnicode(keyword) < 2) {
            return '一文字登録はできません';
        }

        // 文字数上限のバリデーション
        if (utils.countUnicode(keyword) >= 50) {
            return '50文字以上の教育はできません';
        }

        // URL長さのバリデーション
        if (utils.countUnicode(url) > 300) {
            return 'URLは300文字以内にしてください';
        }

        // URL形式のバリデーション
        if (checkUrlFormat && utils.neutralizeUrls(url, '<#0>') !== '<#0>') {
            return 'URLの形式が間違っています';
        }

        return null;
    }
}

module.exports = FoleyCreateCommand;

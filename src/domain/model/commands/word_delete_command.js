const path = require('path');
const logger = require('log4js').getLogger(path.basename(__filename));
const assert = require('assert').strict;
const WordDeleteAction = require('../../entity/actions/word_delete_action');
const ActionResponse = require('../../entity/responses/action_response');

/** @typedef {import('../../entity/command_input')} CommandInput */
/** @typedef {import('../../entity/responses').ResponseT} ResponseT */
/** @typedef {import('../../entity/server_status')} ServerStatus */

/**
 * ドメインモデル
 * 教育単語削除コマンド
 */
class WordDeleteCommand {
    /**
     * @type {'word_delete'}
     */
    get type() {
        return 'word_delete';
    }

    /**
     * @type {string[]}
     */
    static get names() {
        return ['忘却', 'forget', 'rm', 'wbook-delete'];
    }

    /**
     * @param {ServerStatus} status コマンド実行下のサーバー状態
     */
    constructor(status) {
        this.status = status;
    }

    /**
     * 教育単語削除コマンドを処理
     *
     * @param {CommandInput} input コマンド引数
     * @returns {ResponseT} レスポンス
     */
    process(input) {
        assert(typeof input === 'object');
        logger.info(`教育単語削除コマンドを受理 ${input}`);

        // コマンド形式のバリデーション
        if (input.argc !== 1) {
            return input.newChatResponse('コマンドの形式が間違っています :sob: 例:`@hanako 忘却 御伽原`', 'error');
        }

        const word = this.status.wordDictionary.lines.find(line => line.from === input.argv[0]);

        // 単語が見つからない
        if (!word) {
            return input.newChatResponse('その単語は教育されていません', 'error');
        }

        // 教育単語削除アクションを作成
        const action = new WordDeleteAction({
            id: input.id,
            serverId: input.origin.serverId,
            wordId: word.id,
        });
        const onSuccess = input.newChatResponse(`1 2の…ポカン！『${word.from}』を忘れました！ :bulb:`);
        return new ActionResponse({ id: input.id, action, onSuccess });
    }
}

module.exports = WordDeleteCommand;

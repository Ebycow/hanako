const path = require('path');
const logger = require('log4js').getLogger(path.basename(__filename));
const assert = require('assert').strict;
const SpeakerUpdateAction = require('../../entity/actions/speaker_update_action');
const ActionResponse = require('../../entity/responses/action_response');

/** @typedef {import('../../entity/command_input')} CommandInput */
/** @typedef {import('../../entity/responses').ResponseT} ResponseT */
/** @typedef {import('../hanako')} Hanako */

/**
 * ドメインモデル
 * キャラクター変更コマンド
 */
class SpeakerCommand {
    /**
     * @type {'speaker'}
     */
    get type() {
        return 'speaker';
    }

    /**
     * @type {string[]}
     */
    static get names() {
        return ['キャラクター変更', 'speaker'];
    }

    /**
     * @param {Hanako} hanako コマンド実行下の読み上げ花子
     */
    constructor(hanako) {
        this.hanako = hanako;
    }

    /**
     * キャラクター変更コマンドを処理
     *
     * @param {CommandInput} input コマンド引数
     * @returns {ResponseT} レスポンス
     */
    process(input) {
        assert(typeof input === 'object');
        logger.info(`キャラクター変更コマンドを受理 ${input}`);

        // コマンド形式のバリデーション
        if (input.argc !== 1) {
            return input.newChatResponse(
                'コマンドの形式が間違っています :sob: 例:`@hanako キャラクター変更 default`',
                'error'
            );
        }

        const newSpeaker = input.argv[0];

        // キャラクター変更アクションを作成
        const action = new SpeakerUpdateAction({
            id: input.id,
            serverId: input.serverId,
            speaker: newSpeaker,
        });
        let onSuccess;
        if (newSpeaker === 'default') {
            onSuccess = input.newChatResponse('読み上げるキャラクターをデフォルトに戻しました :beginner:');
        } else {
            onSuccess = input.newChatResponse(
                `読み上げるキャラクターを${newSpeaker}に変更しました。元に戻す場合は@hanako キャラクター変更 default を入力します :microphone:`
            );
        }
        return new ActionResponse({ id: input.id, action, onSuccess });
    }
}

module.exports = SpeakerCommand;

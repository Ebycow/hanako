const path = require('path');
const logger = require('log4js').getLogger(path.basename(__filename));
const assert = require('assert').strict;
const SpeakerUpdateAction = require('../../entity/actions/speaker_update_action');
const ActionResponse = require('../../entity/responses/action_response');

/** @typedef {import('./index').SlashCommandDefinition} SlashCommandDefinition */
/** @typedef {import('../../entity/command_input')} CommandInput */
/** @typedef {import('../../entity/responses').ResponseT} ResponseT */
/** @typedef {import('../hanako')} Hanako */
/** @typedef {import('../../repo/i_voice_catalog_repo').VoiceInfo} VoiceInfo */

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
     * スラッシュコマンドの定義
     *
     * @type {SlashCommandDefinition}
     */
    static get slash() {
        return {
            name: 'speaker',
            description: '読み上げキャラクターを変更します',
            options: [
                {
                    type: 'string',
                    name: 'name',
                    description: 'キャラクター名（入力すると候補が出ます）',
                    required: true,
                    autocomplete: true,
                },
            ],
        };
    }

    /**
     * テキストで入力された引数を名前付きの引数に変換
     *
     * @param {CommandInput} input コマンド引数
     * @returns {{args: {name: string}}|{response: ResponseT}} 名前付きの引数、または形式エラーのレスポンス
     */
    static parseText(input) {
        // 「ずんだもん あまあま」のように空白を含む名前も受け付ける
        if (input.argc < 1) {
            return {
                response: input.newChatResponse(
                    'コマンドの形式が間違っています :sob: 例:`@hanako キャラクター変更 default`',
                    'error'
                ),
            };
        }
        return { args: { name: input.argv.join(' ') } };
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

        const newSpeaker = input.args.name;

        // キャラクター変更アクションを作成
        const action = new SpeakerUpdateAction({
            id: input.id,
            serverId: input.serverId,
            userId: input.userId,
            speaker: newSpeaker,
        });
        // 入力はあいまいでもよい。照合した結果の話者で成功を伝える
        const onSuccess = (voice) => input.newChatResponse(successMessage(input, voice));
        const onFailure = input.newChatResponse('読み上げるキャラクターを変更できませんでした :sob:', 'error');
        return new ActionResponse({ id: input.id, action, onSuccess, onFailure });
    }
}

/**
 * キャラクターを変更したときのメッセージ
 *
 * @param {CommandInput} input コマンド引数
 * @param {VoiceInfo} voice 照合した話者
 * @returns {string}
 */
function successMessage(input, voice) {
    if (voice.address === 'default') {
        return '読み上げるキャラクターをデフォルトに戻しました :beginner:';
    }
    const name = voice.displayName === voice.address ? voice.address : `${voice.displayName}（${voice.address}）`;
    const revert = input.usage('@hanako キャラクター変更 default', '/speaker name:default');
    let message = `読み上げるキャラクターを${name}に変更しました。元に戻す場合は${revert} を入力します :microphone:`;
    const terms = voice.termsUrl ? `[利用規約](<${linkUrl(voice.termsUrl)}>)` : null;
    if (voice.credit) {
        message += `\n音声: ${voice.credit}` + (terms ? `（${terms}）` : '');
    } else if (terms) {
        message += `\n音声の${terms}`;
    }
    return message;
}

/**
 * Discord のリンクにできる形の URL にする（日本語のドメインやパスを含む規約の URL があるため）
 *
 * @param {string} url
 * @returns {string}
 */
function linkUrl(url) {
    try {
        return new URL(url).href;
    } catch {
        return url;
    }
}

module.exports = SpeakerCommand;

const assert = require('assert').strict;
const Injector = require('../../core/injector');
const IDiscordVcActionRepo = require('../repo/i_discord_vc_action_repo');
const IWordActionRepo = require('../repo/i_word_action_repo');
const ISilenceActionRepo = require('../repo/i_silence_action_repo');
const ISettingsActionRepo = require('../repo/i_settings_action_repo');
const IFoleyActionRepo = require('../repo/i_foley_action_repo');
const IVoiceCatalogRepo = require('../repo/i_voice_catalog_repo');
const errors = require('../../core/errors').promises;

/** @typedef {import('../entity/actions').ActionT} ActionT */

/**
 * ドメインサービス
 * アクションエンティティのハンドラ
 */
class ActionHandler {
    /**
     * @param {null} vcActionRepo DI
     * @param {null} wordActionRepo DI
     * @param {null} silenceActionRepo DI
     * @param {null} foleyActionRepo DI
     * @param {null} settingsActionRepo DI
     * @param {null} voiceCatalogRepo DI
     */
    constructor(
        vcActionRepo = null,
        wordActionRepo = null,
        silenceActionRepo = null,
        foleyActionRepo = null,
        settingsActionRepo = null,
        voiceCatalogRepo = null
    ) {
        this.vcActionRepo = vcActionRepo || Injector.resolve(IDiscordVcActionRepo);
        this.wordActionRepo = wordActionRepo || Injector.resolve(IWordActionRepo);
        this.silenceActionRepo = silenceActionRepo || Injector.resolve(ISilenceActionRepo);
        this.foleyActionRepo = foleyActionRepo || Injector.resolve(IFoleyActionRepo);
        this.settingsActionRepo = settingsActionRepo || Injector.resolve(ISettingsActionRepo);
        this.voiceCatalogRepo = voiceCatalogRepo || Injector.resolve(IVoiceCatalogRepo);
    }

    /**
     * アクションエンティティを処理
     *
     * @param {ActionT} action アクションエンティティ
     * @returns {Promise<void>}
     */
    async handle(action) {
        assert(typeof action === 'object');

        // アクションタイプによって対応するリポジトリに振り分け
        const type = action.type;
        if (type === 'join_voice') {
            return this.vcActionRepo.postJoinVoice(action);
        } else if (type === 'leave_voice') {
            return this.vcActionRepo.postLeaveVoice(action);
        } else if (type === 'seibai') {
            return this.vcActionRepo.postSeibai(action);
        } else if (type === 'word_create') {
            return this.wordActionRepo.postWordCreate(action);
        } else if (type === 'word_delete') {
            return this.wordActionRepo.postWordDelete(action);
        } else if (type === 'word_clear') {
            return this.wordActionRepo.postWordClear(action);
        } else if (type === 'silence_create') {
            return this.silenceActionRepo.postSilenceCreate(action);
        } else if (type === 'silence_delete') {
            return this.silenceActionRepo.postSilenceDelete(action);
        } else if (type === 'silence_clear') {
            return this.silenceActionRepo.postSilenceClear(action);
        } else if (type === 'foley_create') {
            return this.foleyActionRepo.postFoleyCreate(action);
        } else if (type === 'foley_create_multiple') {
            return this.foleyActionRepo.postFoleyCreateMultiple(action);
        } else if (type === 'foley_delete') {
            return this.foleyActionRepo.postFoleyDelete(action);
        } else if (type === 'foley_delete_multiple') {
            return this.foleyActionRepo.postFoleyDeleteMultiple(action);
        } else if (type === 'foley_rename') {
            return this.foleyActionRepo.postFoleyRename(action);
        } else if (type === 'max_count_update') {
            return this.settingsActionRepo.postMaxCountUpdate(action);
        } else if (type === 'speaker_update') {
            return updateSpeakerF.call(this, action);
        } else if (type === 'se_normalize_update') {
            return this.settingsActionRepo.postSeNormalizeUpdate(action);
        } else if (type === 'text_commands_update') {
            return this.settingsActionRepo.postTextCommandsUpdate(action);
        } else {
            throw new Error('unreachable');
        }
    }
}

/**
 * (private) 読み上げキャラクターを照合してから保存する
 * - 見つからなければ候補を添えて errors.disappointed
 *
 * @this {ActionHandler}
 * @param {import('../entity/actions/speaker_update_action')} action
 * @returns {Promise<import('../repo/i_voice_catalog_repo').VoiceInfo>} 保存した話者
 */
async function updateSpeakerF(action) {
    const { voice, suggestions } = await this.voiceCatalogRepo.resolveVoice(action.speaker);
    if (!voice) {
        const hint =
            suggestions.length > 0 ? '\nもしかして: ' + suggestions.map((s) => `\`${s.address}\``).join(' / ') : '';
        return errors.disappointed(
            `voice-not-found ${action}`,
            `「${action.speaker}」という声は見つからなかったよ${hint}`
        );
    }
    // あいまいな入力は、照合した正式な指定に置き換えて保存する
    const resolved = voice.address === action.speaker ? action : action.withSpeaker(voice.address);
    await this.settingsActionRepo.postSpeakerUpdate(resolved);
    return voice;
}

module.exports = ActionHandler;

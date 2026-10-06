const Injector = require('../core/injector');
const IVoiceCatalogRepo = require('../domain/repo/i_voice_catalog_repo');

// Discordの自動補完の候補は25件まで、名前と値は100文字まで
const MAX_CHOICES = 25;
const MAX_LENGTH = 100;

/** @typedef {import('../domain/repo/i_voice_catalog_repo').VoiceInfo} VoiceInfo */

/**
 * 自動補完の候補の名前
 *
 * @param {VoiceInfo} voice
 * @param {string} params 入力に付いていたパラメータ（`?speed=1.2` など）
 * @returns {string}
 */
function labelOf(voice, params) {
    const engine = voice.engine ? ` [${voice.engine}]` : '';
    const label = `${voice.displayName}${params ? ` ${params}` : ''}${engine}`;
    return label.length > MAX_LENGTH ? label.slice(0, MAX_LENGTH - 1) + '…' : label;
}

/**
 * アプリケーションサービス
 * 読み上げキャラクターの自動補完の候補を作る
 */
class VoiceAutocompleteService {
    /**
     * @param {?IVoiceCatalogRepo} voiceCatalogRepo DI
     */
    constructor(voiceCatalogRepo = null) {
        this.voiceCatalogRepo = voiceCatalogRepo || Injector.resolve(IVoiceCatalogRepo);
    }

    /**
     * 入力中の文字列から候補を作る
     * 入力に `?speed=1.2` などのパラメータが付いていれば、候補の値にも付ける
     *
     * @param {string} input 入力中の文字列
     * @returns {Promise<Array<{name: string, value: string}>>} 候補
     */
    async suggest(input) {
        const text = typeof input === 'string' ? input.trim() : '';
        const i = text.indexOf('?');
        const query = i < 0 ? text : text.slice(0, i).trim();
        const params = i < 0 ? '' : text.slice(i);

        const voices = await this.voiceCatalogRepo.searchVoices(query, MAX_CHOICES);
        return voices
            .map((voice) => ({ name: labelOf(voice, params), value: voice.address + params }))
            .filter((choice) => choice.value.length <= MAX_LENGTH)
            .slice(0, MAX_CHOICES);
    }
}

module.exports = VoiceAutocompleteService;

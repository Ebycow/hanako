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
 * @returns {string}
 */
function labelOf(voice) {
    const engine = voice.engine ? ` [${voice.engine}]` : '';
    const label = `${voice.displayName}${engine}`;
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
     * 入力に付いたパラメータ（`?speed=1.2` など）は、リポジトリが候補に付け直す
     *
     * @param {string} input 入力中の文字列
     * @returns {Promise<Array<{name: string, value: string}>>} 候補
     */
    async suggest(input) {
        const text = typeof input === 'string' ? input.trim() : '';
        const voices = await this.voiceCatalogRepo.searchVoices(text, MAX_CHOICES);
        return voices
            .map((voice) => ({ name: labelOf(voice), value: voice.address }))
            .filter((choice) => choice.value.length <= MAX_LENGTH)
            .slice(0, MAX_CHOICES);
    }
}

module.exports = VoiceAutocompleteService;

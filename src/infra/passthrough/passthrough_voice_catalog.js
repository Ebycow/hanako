const errors = require('../../core/errors').promises;
const IVoiceCatalogRepo = require('../../domain/repo/i_voice_catalog_repo');

/** @typedef {import('../../domain/repo/i_voice_catalog_repo').VoiceInfo} VoiceInfo */
/** @typedef {import('../../domain/repo/i_voice_catalog_repo').VoiceResolution} VoiceResolution */
/** @typedef {import('../../domain/entity/voice_catalog')} VoiceCatalog */

/**
 * 話者一覧を持たない環境（Ebyroid に直接つなぐ場合）の話者一覧
 * 候補は出さず、入力をそのまま話者として受け付ける
 *
 * @implements {IVoiceCatalogRepo}
 */
class PassthroughVoiceCatalog {
    /**
     * (impl) IVoiceCatalogRepo
     *
     * @param {string} input
     * @param {number} limit
     * @returns {Promise<Array<VoiceInfo>>}
     */
    async searchVoices(input, limit) {
        return [];
    }

    /**
     * (impl) IVoiceCatalogRepo
     *
     * @param {string} query
     * @returns {Promise<VoiceResolution>}
     */
    async resolveVoice(query) {
        const address = query.trim();
        return { voice: { address, displayName: address, engine: null, credit: null }, suggestions: [] };
    }

    /**
     * (impl) IVoiceCatalogRepo
     * 一覧を持たないので、常に errors.disappointed
     *
     * @returns {Promise<VoiceCatalog>}
     */
    async loadVoiceCatalog() {
        return errors.disappointed('voice-catalog-unsupported', '今の音声エンジンは声の一覧に対応していないよ');
    }
}

// IVoiceCatalogRepoの実装として登録
IVoiceCatalogRepo.comprise(PassthroughVoiceCatalog, []);

module.exports = PassthroughVoiceCatalog;

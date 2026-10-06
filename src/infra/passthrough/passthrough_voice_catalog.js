const IVoiceCatalogRepo = require('../../domain/repo/i_voice_catalog_repo');
const VoiceCatalog = require('../../domain/entity/voice_catalog');

/** @typedef {import('../../domain/repo/i_voice_catalog_repo').VoiceInfo} VoiceInfo */
/** @typedef {import('../../domain/repo/i_voice_catalog_repo').VoiceResolution} VoiceResolution */

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
     * @param {string} query
     * @param {number} limit
     * @returns {Promise<Array<VoiceInfo>>}
     */
    async searchVoices(query, limit) {
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
     *
     * @returns {Promise<VoiceCatalog>}
     */
    async loadVoiceCatalog() {
        return VoiceCatalog.unavailable();
    }
}

// IVoiceCatalogRepoの実装として登録
IVoiceCatalogRepo.comprise(PassthroughVoiceCatalog, []);

module.exports = PassthroughVoiceCatalog;

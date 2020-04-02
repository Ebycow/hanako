const Interface = require('../../core/interface');

/** @typedef {import('../entity/foley_dictionary')} FoleyDictionary */

/**
 * SE辞書のリポジトリ
 */
class IFoleyDictionaryRepo extends Interface {
    /**
     * FoleyDictionaryを読み出し
     *
     * @param {string} serverId DiscordサーバーID
     * @returns {Promise<FoleyDictionary>} 対象DiscordサーバーのSE辞書
     */
    async loadFoleyDictionary(serverId) {}
}

module.exports = IFoleyDictionaryRepo;

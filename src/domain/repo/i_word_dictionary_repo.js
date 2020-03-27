const Interface = require('../../core/interface');

/** @typedef {import('../entity/word_dictionary')} WordDictionary */

/**
 * 教育辞書のリポジトリ
 */
class IWordDictionaryRepo extends Interface {
    /**
     * WordDictionaryを読み出し
     *
     * @param {string} serverId DiscordサーバーID
     * @returns {Promise<WordDictionary>} 対象Discordサーバーの教育辞書
     */
    async loadWordDictionary(serverId) {}
}

module.exports = IWordDictionaryRepo;

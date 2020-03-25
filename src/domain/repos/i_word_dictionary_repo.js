const Interface = require('../../core/interface');

/** @typedef {import('../entities/word_dictionary')} WordDictionary */

/**
 * 教育辞書のリポジトリ
 */
class IWordDictionaryRepo extends Interface {
    /**
     * WordDictionaryを取得
     *
     * @param {string} serverId サーバーID
     * @returns {Promise<WordDictionary>} 対象サーバーの教育辞書
     */
    async loadWordDictionary(serverId) {}
}

module.exports = IWordDictionaryRepo;

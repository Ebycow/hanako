const Interface = require('../../core/interface');

/** @typedef {import('../entity/silence_dictionary')} SilenceDictionary */

/**
 * 沈黙ユーザー辞書のリポジトリ
 */
class ISilenceDictionaryRepo extends Interface {
    /**
     * SilenceDictionaryを読み出し
     *
     * @param {string} serverId DiscordサーバーID
     * @returns {Promise<SilenceDictionary>} 対象Discordサーバーの沈黙ユーザー辞書
     */
    async loadSilenceDictionary(serverId) {}
}

module.exports = ISilenceDictionaryRepo;

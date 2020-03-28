const Interface = require('../../core/interface');

/** @typedef {import('../entity/settings')} Settings */

/**
 * 読み上げ花子の設定リポジトリ
 */
class ISettingsRepo extends Interface {
    /**
     * Settingsを読み出し
     *
     * @param {string} serverId DiscordサーバーID
     * @returns {Promise<Settings>} 対象Discordサーバーの読み上げ花子の設定
     */
    async loadSettings(serverId) {}
}

module.exports = ISettingsRepo;

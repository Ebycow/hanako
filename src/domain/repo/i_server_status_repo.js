const Interface = require('../../core/interface');

/** @typedef {import('../entity/server_status')} ServerStatus */

/**
 * サーバーステータスリポジトリ
 */
class IServerStatusRepo extends Interface {
    /**
     * ServerStatusを読み出し
     * 存在しない場合はerrors.unexpected
     *
     * @param {string} serverId DiscordサーバーID
     * @returns {Promise<ServerStatus>} 対象Discordサーバーのサーバーステータス
     */
    async loadServerStatus(serverId) {}
}

module.exports = IServerStatusRepo;

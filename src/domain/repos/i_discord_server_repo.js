const Interface = require('../../core/interface');

class IDiscordServerRepo extends Interface {
    /**
     * DiscordServerを取得または新規生成
     * @param {string} id サーバーID
     * @returns {Promise<import('../models/discord_server')>}
     */
    async loadOrCreate(id) {}
}

module.exports = IDiscordServerRepo;

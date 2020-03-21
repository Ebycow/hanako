const Interface = require('../../core/interface');

/** @typedef {import('../models/discord_server')} DiscordServer */

/**
 * ディスコードサーバーリポジトリ
 */
class IDiscordServerRepo extends Interface {
    /**
     * DiscordServerを取得
     * 存在しない場合はerrors.unexpected
     *
     * @param {string} id サーバーID
     * @returns {Promise<DiscordServer>}
     */
    async load(id) {}
}

module.exports = IDiscordServerRepo;

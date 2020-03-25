const path = require('path');
const logger = require('log4js').getLogger(path.basename(__filename));
const assert = require('assert').strict;
const Injector = require('../core/injector');
const IDiscordServerRepo = require('../domain/repos/i_discord_server_repo');

// unused
logger;

/** @typedef {import('../domain/models/discord_server')} DiscordServer */

/**
 * アプリケーションサービス
 * DiscordServerモデルを取得
 */
class ServerLoader {
    /**
     * @param {null} serverRepo DI
     */
    constructor(serverRepo = null) {
        this.serverRepo = serverRepo || Injector.resolve(IDiscordServerRepo);
    }

    /**
     * サーバーモデルをロードする
     * 存在しないときerrors.unexpected
     *
     * @param {object} data
     * @param {string} data.id サーバーID
     * @returns {Promise<DiscordServer>} サーバーモデル
     */
    async load(data) {
        assert(typeof data.id === 'string');

        const server = await this.serverRepo.load(data.id);
        return Promise.resolve(server);
    }
}

module.exports = ServerLoader;

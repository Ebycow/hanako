const path = require('path');
const logger = require('log4js').getLogger(path.basename(__filename));
const assert = require('assert').strict;
const uuid = require('uuidv4').uuid;
const discord = require('discord.js');
const errors = require('../../core/errors').promises;
const Injector = require('../../core/injector');
const IServerStatusRepo = require('../../domain/repo/i_server_status_repo');
const ServerStatus = require('../../domain/entity/server_status');

// unused
logger;

class DiscordServerInfoManager {
    /**
     * DIコンテナ用コンストラクタ
     *
     * @param {null} client DI
     */
    constructor(client = null) {
        this.client = client || Injector.resolveSingleton(discord.Client);
    }

    /**
     * (impl) IServerStatusRepo
     *
     * @param {string} serverId
     * @returns {Promise<ServerStatus>}
     */
    async loadServerStatus(serverId) {
        assert(typeof serverId === 'string');

        const guild = this.client.guilds.resolve(serverId);
        if (!guild) {
            return errors.unexpected(`no-such-guild ${serverId}`);
        }

        // 新規サーバーステータスを生成
        const serverStatus = new ServerStatus({
            id: uuid(),
            serverId: guild.id,
            serverName: guild.name,
        });

        // サーバーステータスを返却
        return Promise.resolve(serverStatus);
    }
}

// IServerStatusRepoの実装として登録
IServerStatusRepo.comprise(DiscordServerInfoManager);

module.exports = DiscordServerInfoManager;

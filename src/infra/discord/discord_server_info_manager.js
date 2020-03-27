const path = require('path');
const logger = require('log4js').getLogger(path.basename(__filename));
const assert = require('assert').strict;
const uuid = require('uuidv4').uuid;
const discord = require('discord.js');
const errors = require('../../core/errors').promises;
const AppSettings = require('../../core/app_settings');
const IServerStatusRepo = require('../../domain/repo/i_server_status_repo');
const ServerStatus = require('../../domain/entity/server_status');

// unused
logger;

class DiscordServerInfoManager {
    /**
     * DIコンテナ用コンストラクタ
     *
     * @param {discord.Client} client DI
     * @param {AppSettings} appSettings DI
     */
    constructor(client, appSettings) {
        this.client = client;
        this.appSettings = appSettings;
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
            prefix: this.appSettings.defaultCommandPrefix,
        });

        // サーバーステータスを返却
        return Promise.resolve(serverStatus);
    }
}

// IServerStatusRepoの実装として登録
IServerStatusRepo.comprise(DiscordServerInfoManager, [discord.Client, AppSettings]);

module.exports = DiscordServerInfoManager;

const assert = require('assert').strict;

/**
 * エンティティ
 * Discordサーバーのステータス
 */
class ServerStatus {
    /**
     * ServerStatusエンティティを構築
     *
     * @param {object} data
     * @param {string} data.id エンティティID
     * @param {string} data.serverId DiscordサーバーID
     * @param {string} data.serverName Discordサーバー名
     */
    constructor(data) {
        assert(typeof data.id === 'string');
        assert(typeof data.serverId === 'string');
        assert(typeof data.serverName === 'string');

        Object.defineProperty(this, 'data', {
            value: Object.assign({}, data),
            writable: false,
            enumerable: true,
            configurable: false,
        });
    }

    /**
     * エンティティID
     *
     * @type {string}
     */
    get id() {
        return this.data.id;
    }

    /**
     * DiscordサーバーID
     *
     * @type {string}
     */
    get serverId() {
        return this.data.serverId;
    }

    /**
     * Discordサーバー名
     *
     * @type {string}
     */
    get serverName() {
        return this.data.serverName;
    }

    toString() {
        return `ServerStatus(id=${this.id}, serverId=${this.serverId}, serverName=${this.serverName})`;
    }
}

module.exports = ServerStatus;

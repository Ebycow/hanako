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
     * @param {string} data.prefix コマンドのプリフィックス
     */
    constructor(data) {
        assert(typeof data.id === 'string');
        assert(typeof data.serverId === 'string');
        assert(typeof data.serverName === 'string');
        assert(typeof data.prefix === 'string');

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

    /**
     * コマンドのプリフィックス
     *
     * @type {string}
     */
    get prefix() {
        return this.data.prefix;
    }

    toString() {
        return `ServerStatus(id=${this.id}, serverId=${this.serverId}, serverName=${this.serverName}, prefix=${this.prefix})`;
    }
}

module.exports = ServerStatus;

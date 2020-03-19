const assert = require('assert').strict;

/**
 * エンティティ
 * Discordのメッセージ
 */
class DiscordMessage {
    /**
     * @param {object} data
     * @param {string} data.id
     * @param {string} data.content
     * @param {'command'|'read'} data.type
     * @param {string} data.serverId
     */
    constructor(data) {
        assert(typeof data.id === 'string');
        assert(typeof data.content === 'string');
        assert(data.type === 'command' || data.type === 'read');
        assert(typeof data.serverId === 'string');

        Object.defineProperty(this, 'data', {
            value: data,
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
     * メッセージ内容
     *
     * @type {string}
     */
    get content() {
        return this.data.content;
    }

    /**
     * メッセージタイプ
     *
     * @type {'command'|'read'}
     */
    get type() {
        return this.data.type;
    }

    /**
     * 送信元サーバーID
     *
     * @type {string}
     */
    get serverId() {
        return this.data.serverId;
    }

    toString() {
        return `DiscordMessage(type=${this.type}, content=${this.content})`;
    }
}

module.exports = DiscordMessage;

const assert = require('assert').strict;

/**
 * エンティティ
 * 受信したDiscordのメッセージ
 */
class DiscordMessage {
    /**
     * DiscordMessageエンティティを構築
     *
     * @param {object} data
     * @param {string} data.id エンティティID
     * @param {string} data.content メッセージ内容
     * @param {'command'|'read'} data.type メッセージタイプ
     * @param {string} data.serverId 送信元サーバーID
     * @param {string} data.channelId 送信元チャンネルID
     * @param {?string} data.voiceChannelId 送信者が参加中の音声チャンネルID またはnull
     */
    constructor(data) {
        assert(typeof data.id === 'string');
        assert(typeof data.content === 'string');
        assert(data.type === 'command' || data.type === 'read');
        assert(typeof data.serverId === 'string');
        assert(typeof data.channelId === 'string');
        assert(typeof data.voiceChannelId === 'string' || data.voiceChannelId === null);

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

    /**
     * 送信元テキストチャンネルID
     *
     * @type {string}
     */
    get channelId() {
        return this.data.channelId;
    }

    /**
     * 送信者が参加中の音声チャンネルID またはnull
     *
     * @type {?string}
     */
    get voiceChannelId() {
        return this.data.voiceChannelId;
    }

    toString() {
        return `DiscordMessage(type=${this.type}, content=${this.content})`;
    }
}

module.exports = DiscordMessage;

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
     * @param {string} data.serverId 送信元DiscordサーバーID
     * @param {string} data.channelId 送信元チャンネルID
     * @param {string} data.userId 送信者のユーザーID
     * @param {?string} data.voiceChannelId 送信者が参加中の音声チャンネルID またはnull
     * @param {Map<string, string>} data.mentionedUsers メンションされているユーザーの表示名とユーザーIDの辞書配列
     */
    constructor(data) {
        assert(typeof data.id === 'string');
        assert(typeof data.content === 'string');
        assert(data.type === 'command' || data.type === 'read');
        assert(typeof data.serverId === 'string');
        assert(typeof data.channelId === 'string');
        assert(typeof data.userId === 'string');
        assert(typeof data.voiceChannelId === 'string' || data.voiceChannelId === null);
        assert(typeof data.mentionedUsers === 'object');

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
     * 送信元DiscordサーバーID
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
     * 送信者のユーザーID
     *
     * @type {string}
     */
    get userId() {
        return this.data.userId;
    }

    /**
     * 送信者が参加中の音声チャンネルID またはnull
     *
     * @type {?string}
     */
    get voiceChannelId() {
        return this.data.voiceChannelId;
    }

    /**
     * メンションされているユーザーの表示名とユーザーIDの辞書配列
     *
     * @type {Map<string, string>}
     */
    get mentionedUsers() {
        return new Map(this.data.mentionedUsers);
    }

    toString() {
        const mentionedUsersJson = JSON.stringify(Object.fromEntries(this.mentionedUsers.entries()));
        return `DiscordMessage(id=${this.id}, type=${this.type}, serverId=${this.serverId}, channelId=${this.channelId}, userId=${this.userId}, voiceChannelId=${this.voiceChannelId}, mentionedUsers=${mentionedUsersJson} content=${this.content})`;
    }
}

module.exports = DiscordMessage;

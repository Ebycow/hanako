const assert = require('assert').strict;

/**
 * エンティティ
 * あるDiscordサーバーにおける花子の音声ステータス
 */
class VoiceStatus {
    /**
     * VoiceStatusエンティティを構築
     *
     * @param {object} data
     * @param {string} data.id エンティティID
     * @param {string} data.serverId DiscordサーバーID
     * @param {'ready'|'speaking'} data.state 音声状態 'ready'=待機中 'speaking'=読み上げ中
     * @param {string} data.voiceChannelId 接続中の音声チャネルID
     * @param {string[]} data.readingChannelsId 読み上げ中のテキストチャネルIDの配列
     */
    constructor(data) {
        assert(typeof data.id === 'string');
        assert(typeof data.serverId === 'string');
        assert(data.state === 'ready' || data.state === 'speaking');
        assert(typeof data.voiceChannelId === 'string');
        assert(typeof data.readingChannelsId === 'object' && Array.isArray(data.readingChannelsId));

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
     * 音声状態
     *
     * - 音声送信中 = 'speaking'
     * - 読み上げ待機中 = 'ready'
     *
     * @type {'speaking'|'ready'}
     */
    get state() {
        return this.data.state;
    }

    /**
     * 接続中の音声チャンネルID
     *
     * @type {string}
     */
    get voiceChannelId() {
        return this.data.voiceChannelId;
    }

    /**
     * 読み上げ中テキストチャンネルの配列
     *
     * @type {Array<string>}
     */
    get readingChannelsId() {
        return this.data.readingChannelsId.slice();
    }

    toString() {
        return `VoiceStatus(id=${this.id}, serverId=${this.serverId}, state=${this.state}, voiceChannelId=${this.voiceChannelId}, readingChannelsId=${this.readingChannelsId})`;
    }
}

module.exports = VoiceStatus;

const assert = require('assert').strict;

/**
 * エンティティ
 * 花子のボイスチャット復帰情報
 */
class RecoveryInfo {
    /**
     * RecoveryInfoエンティティを構築
     *
     * @param {object} data
     * @param {string} data.id エンティティID
     * @param {string} data.serverId DiscordサーバーID
     * @param {string} data.voiceChannelId 接続していた音声チャネルのID
     * @param {string[]} data.readingChannelsId 読み上げていたテキストチャネルIDの配列
     */
    constructor(data) {
        assert(typeof data.id === 'string');
        assert(typeof data.serverId === 'string');
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
     * 接続していたの音声チャンネルID
     *
     * @type {string}
     */
    get voiceChannelId() {
        return this.data.voiceChannelId;
    }

    /**
     * 読み上げていたテキストチャンネルIDの配列
     *
     * @type {Array<string>}
     */
    get readingChannelsId() {
        return this.data.readingChannelsId.slice();
    }

    toString() {
        return `RecoveryInfo(id=${this.id}, serverId=${this.serverId}, voiceChannelId=${this.voiceChannelId}, readingChannelsId=${this.readingChannelsId})`;
    }
}

module.exports = RecoveryInfo;

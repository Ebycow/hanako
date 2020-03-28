const assert = require('assert').strict;

/** @typedef {import('stream').Readable} Readable */

/**
 * レスポンスエンティティ
 * ディスコードに音声を送信するレスポンス
 */
class VoiceResponse {
    /**
     * @type {'voice'}
     */
    get type() {
        return 'voice';
    }

    /**
     * VoiceResponseエンティティを構築する
     *
     * @param {object} data
     * @param {string} data.id エンティティID
     * @param {Readable} data.stream 音声ストリーム
     * @param {string} data.serverId 送信先DiscordサーバーID
     */
    constructor(data) {
        assert(typeof data.id === 'string');
        assert(typeof data.stream === 'object');
        assert(typeof data.serverId === 'string');

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
     * 音声ストリーム
     *
     * @type {Readable}
     */
    get stream() {
        return this.data.stream;
    }

    /**
     * 送信先DiscordサーバーID
     *
     * @type {string}
     */
    get serverId() {
        return this.data.serverId;
    }

    toString() {
        return `VoiceResponse(id=${this.id}, serverId=${this.serverId}, stream=${this.stream})`;
    }
}

module.exports = VoiceResponse;

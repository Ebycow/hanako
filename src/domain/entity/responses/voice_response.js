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
     * @param {object} param
     * @param {string} param.id エンティティID
     * @param {Readable} param.stream 音声ストリーム
     * @param {string} param.serverId 送信先サーバーID
     */
    constructor({ id, stream, serverId }) {
        assert(typeof id === 'string');
        assert(typeof stream === 'object');
        assert(typeof serverId === 'string');

        const data = { id, stream, serverId };
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
     * 音声ストリーム
     *
     * @type {Readable}
     */
    get stream() {
        return this.data.stream;
    }

    /**
     * 送信先サーバーID
     *
     * @type {string}
     */
    get serverId() {
        return this.data.serverId;
    }

    toString() {
        return 'VoiceResponse(stream)';
    }
}

module.exports = VoiceResponse;

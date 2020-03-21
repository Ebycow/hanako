const assert = require('assert').strict;
const uuid = require('uuidv4').uuid;

/** @typedef {import('./word_dictionary')} WordDictionary */

/**
 * 読み取り専用のサーバー状態エンティティ
 */
class ServerStatus {
    /**
     * ServerStatusエンティティを構築
     *
     * @param {object} data
     * @param {string} data.serverId サーバーID
     * @param {string} data.serverName サーバー名
     * @param {string|null} data.voiceChannel 接続中の音声チャネルID またはnull
     * @param {string[]} data.readingChannels 読み上げ中のテキストチャネルIDの配列
     * @param {WordDictionary} data.wordDictionary 花子の教育辞書
     */
    constructor(data) {
        assert(typeof data.serverId === 'string');
        assert(typeof data.serverName === 'string');
        assert(typeof data.voiceChannel === 'string' || data.voiceChannel === null);
        assert(typeof data.readingChannels === 'object' && Array.isArray(data.readingChannels));
        assert(typeof data.wordDictionary === 'object');

        Object.defineProperty(this, 'data', {
            value: Object.assign({}, data, { id: uuid() }),
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
     * サーバーID
     *
     * @type {string}
     */
    get serverId() {
        return this.data.serverId;
    }

    /**
     * サーバー名
     *
     * @type {string}
     */
    get serverName() {
        return this.data.serverName;
    }

    /**
     * 接続中の音声チャンネルID またはnull
     *
     * @type {string|null}
     */
    get voiceChannel() {
        return this.data.voiceChannel;
    }

    /**
     * 読み上げ中テキストチャンネルの配列
     *
     * @type {Array<string>}
     */
    get readingChannels() {
        return this.data.readingChannels;
    }

    /**
     * 花子の教育辞書
     *
     * @type {WordDictionary}
     */
    get wordDictionary() {
        return this.data.wordDictionary;
    }

    toString() {
        return `ServerStatus(serverName=${this.serverName}, voiceChannel=${this.voiceChannel}, readingChannels=${this.readingChannels}, wordDictionary=${this.wordDictionary})`;
    }
}

module.exports = ServerStatus;
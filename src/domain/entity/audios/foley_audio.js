const assert = require('assert').strict;

/**
 * オーディオエンティティ
 * SE音声挿入
 */
class FoleyAudio {
    /**
     * @type {'foley'}
     */
    get type() {
        return 'foley';
    }

    /**
     * FoleyAudioエンティティを構築する
     *
     * @param {object} data
     * @param {string} data.serverId DiscordサーバーのID
     * @param {string} data.foleyId SEのID
     */
    constructor(data) {
        assert(typeof data.serverId === 'string');
        assert(typeof data.foleyId === 'string');

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
        return Buffer.from(this.data.serverId + this.data.foleyId).toString('base64');
    }

    /**
     * DiscordサーバーのID
     *
     * @type {string}
     */
    get serverId() {
        return this.data.serverId;
    }

    /**
     * SEのID
     *
     * @type {string}
     */
    get foleyId() {
        return this.data.foleyId;
    }

    toString() {
        return `FoleyAudio(id=${this.id}, serverId=${this.serverId}, foleyId=${this.foleyId})`;
    }
}

module.exports = FoleyAudio;

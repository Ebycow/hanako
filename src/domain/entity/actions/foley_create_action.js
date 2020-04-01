const assert = require('assert').strict;

/**
 * SE追加アクションのエンティティ
 */
class FoleyCreateAction {
    /**
     * @type {'foley_create'}
     */
    get type() {
        return 'foley_create';
    }

    /**
     * FoleyCreateActionエンティティを構築
     *
     * @param {object} data
     * @param {string} data.id エンティティID
     * @param {string} data.serverId 対象DiscordサーバーのID
     * @param {string} data.url SEの音源データURL
     */
    constructor(data) {
        assert(typeof data.id === 'string');
        assert(typeof data.serverId === 'string');
        assert(typeof data.url === 'string');

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
     * 対象DiscordサーバーのID
     *
     * @type {string}
     */
    get serverId() {
        return this.data.serverId;
    }

    /**
     * SEの音源データURL
     *
     * @type {string}
     */
    get url() {
        return this.data.url;
    }

    toString() {
        return `FoleyCreateAction(id=${this.id}, serverId=${this.serverId}, url=${this.url})`;
    }
}

module.exports = FoleyCreateAction;

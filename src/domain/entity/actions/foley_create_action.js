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
     * @param {string} data.keyword SEに対応するキーワード
     * @param {string} data.url SEの音源データURL
     */
    constructor(data) {
        assert(typeof data.id === 'string');
        assert(typeof data.serverId === 'string');
        assert(typeof data.keyword === 'string');
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
     * SEに対応するキーワード
     *
     * @type {string}
     */
    get keyword() {
        return this.data.keyword;
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
        return `FoleyCreateAction(id=${this.id}, serverId=${this.serverId}, keyword=${this.keyword}, url=${this.url})`;
    }
}

module.exports = FoleyCreateAction;

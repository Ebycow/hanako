const assert = require('assert').strict;

/**
 * 成敗アクションのエンティティ
 */
class SeibaiAction {
    /**
     * @type {'seibai'}
     */
    get type() {
        return 'seibai';
    }

    /**
     * SeibaiActionエンティティを構築
     *
     * @param {object} data
     * @param {string} data.id エンティティID
     * @param {string} data.serverId 成敗するDiscordサーバーのID
     */
    constructor(data) {
        assert(typeof data.id === 'string');
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
     * 成敗するDiscordサーバーのID
     *
     * @type {string}
     */
    get serverId() {
        return this.data.serverId;
    }

    toString() {
        return `SeibaiAction(id=${this.id}, serverId=${this.serverId})`;
    }
}

module.exports = SeibaiAction;

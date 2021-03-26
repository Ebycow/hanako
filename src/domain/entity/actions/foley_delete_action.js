const assert = require('assert').strict;

/**
 * SE削除アクションのエンティティ
 */
class FoleyDeleteAction {
    /**
     * @type {'foley_delete'}
     */
    get type() {
        return 'foley_delete';
    }

    /**
     * FoleyDeleteActionエンティティを構築
     *
     * @param {object} data
     * @param {string} data.id エンティティID
     * @param {string} data.serverId 対象DiscordサーバーのID
     * @param {string} data.foleyId SEのID
     */
    constructor(data) {
        assert(typeof data.id === 'string');
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
     * 削除するSEのID
     *
     * @type {string}
     */
    get foleyId() {
        return this.data.foleyId;
    }

    toString() {
        return `FoleyDeleteAction(id=${this.id}, serverId=${this.serverId}, url=${this.foleyId})`;
    }
}

module.exports = FoleyDeleteAction;

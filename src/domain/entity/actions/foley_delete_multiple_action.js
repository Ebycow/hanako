const assert = require('assert').strict;

/**
 * 複数SE削除アクションのエンティティ
 */
class FoleyDeleteMultipleAction {
    /**
     * @type {'foley_delete_multiple'}
     */
    get type() {
        return 'foley_delete_multiple';
    }

    /**
     * FoleyDeleteMultipleActionエンティティを構築
     *
     * @param {object} data
     * @param {string} data.id エンティティID
     * @param {string} data.serverId 対象DiscordサーバーのID
     * @param {Array<string>} data.foleyIds 削除するSEのID配列
     */
    constructor(data) {
        assert(typeof data.id === 'string');
        assert(typeof data.serverId === 'string');
        assert(Array.isArray(data.foleyIds));
        assert(data.foleyIds.every((id) => typeof id === 'string'));

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
     * 削除するSEのID配列
     *
     * @type {Array<string>}
     */
    get foleyIds() {
        return this.data.foleyIds.slice();
    }

    toString() {
        return `FoleyDeleteMultipleAction(id=${this.id}, serverId=${this.serverId}, foleyIds=[${this.foleyIds.join(
            ','
        )}])`;
    }
}

module.exports = FoleyDeleteMultipleAction;

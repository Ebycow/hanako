const assert = require('assert').strict;

/**
 * 最大読み上げ文字数更新アクションのエンティティ
 */
class MaxCountUpdateAction {
    /**
     * @type {'max_count_update'}
     */
    get type() {
        return 'max_count_update';
    }

    /**
     * MaxCountUpdateActionエンティティを構築
     *
     * @param {object} data
     * @param {string} data.id エンティティID
     * @param {string} data.serverId 対象DiscordサーバーのID
     * @param {number} data.maxCount 新しい最大読み上げ文字数
     */
    constructor(data) {
        assert(typeof data.id === 'string');
        assert(typeof data.serverId === 'string');
        assert(typeof data.maxCount === 'number' && Number.isInteger(data.maxCount) && data.maxCount >= 0);

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
     * 新しい最大読み上げ文字数
     *
     * @type {number}
     */
    get maxCount() {
        return this.data.maxCount;
    }

    toString() {
        return `MaxCountUpdateAction(id=${this.id}, serverId=${this.serverId}, maxCount=${this.maxCount})`;
    }
}

module.exports = MaxCountUpdateAction;

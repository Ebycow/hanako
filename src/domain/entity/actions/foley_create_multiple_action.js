const assert = require('assert').strict;

/**
 * 複数SE追加アクションのエンティティ
 */
class FoleyCreateMultipleAction {
    /**
     * @type {'foley_create_multiple'}
     */
    get type() {
        return 'foley_create_multiple';
    }

    /**
     * FoleyCreateMultipleActionエンティティを構築
     *
     * @param {object} data
     * @param {string} data.id エンティティID
     * @param {string} data.serverId 対象DiscordサーバーのID
     * @param {Array<{keyword: string, url: string}>} data.items 追加するSEのキーワードとURLのペア配列
     */
    constructor(data) {
        assert(typeof data.id === 'string');
        assert(typeof data.serverId === 'string');
        assert(Array.isArray(data.items));
        assert(data.items.every(item => typeof item.keyword === 'string' && typeof item.url === 'string'));

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
     * 追加するSEのキーワードとURLのペア配列
     *
     * @type {Array<{keyword: string, url: string}>}
     */
    get items() {
        return this.data.items.slice();
    }

    toString() {
        const itemsStr = this.items.map(item => `${item.keyword}:${item.url}`).join(',');
        return `FoleyCreateMultipleAction(id=${this.id}, serverId=${this.serverId}, items=[${itemsStr}])`;
    }
}

module.exports = FoleyCreateMultipleAction;

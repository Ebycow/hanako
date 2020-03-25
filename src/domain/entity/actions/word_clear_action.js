const assert = require('assert').strict;

/**
 * 教育単語初期化アクションのエンティティ
 */
class WordClearAction {
    /**
     * @type {'word_clear'}
     */
    get type() {
        return 'word_clear';
    }

    /**
     * WordClearActionエンティティを構築
     *
     * @param {object} data
     * @param {string} data.id エンティティID
     * @param {string} data.serverId 初期化対象サーバーのID
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
     * 初期化対象サーバーのID
     *
     * @type {string}
     */
    get serverId() {
        return this.data.serverId;
    }

    toString() {
        return `WordClearAction(id=${this.id}, serverId=${this.serverId})`;
    }
}

module.exports = WordClearAction;

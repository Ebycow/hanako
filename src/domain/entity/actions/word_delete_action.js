const assert = require('assert').strict;

/**
 * 教育単語削除アクションのエンティティ
 */
class WordDeleteAction {
    /**
     * @type {'word_delete'}
     */
    get type() {
        return 'word_delete';
    }

    /**
     * WordDeleteActionエンティティを構築
     *
     * @param {object} data
     * @param {string} data.id エンティティID
     * @param {string} data.serverId 対象サーバーのID
     * @param {string} data.wordId 削除する単語のID
     */
    constructor(data) {
        assert(typeof data.id === 'string');
        assert(typeof data.serverId === 'string');
        assert(typeof data.wordId === 'string');

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
     * 対象サーバーのID
     *
     * @type {string}
     */
    get serverId() {
        return this.data.serverId;
    }

    /**
     * 削除する単語のID
     *
     * @type {string}
     */
    get wordId() {
        return this.data.wordId;
    }

    toString() {
        return `WordDeleteAction(id=${this.id}, serverId=${this.serverId}, wordId=${this.wordId})`;
    }
}

module.exports = WordDeleteAction;

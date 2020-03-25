const assert = require('assert').strict;

/**
 * 教育単語追加アクションのエンティティ
 */
class WordCreateAction {
    /**
     * @type {'word_create'}
     */
    get type() {
        return 'word_create';
    }

    /**
     * WordCreateActionエンティティを構築
     *
     * @param {object} data
     * @param {string} data.id エンティティID
     * @param {string} data.serverId 対象サーバーのID
     * @param {string} data.from 置換前単語
     * @param {string} data.to 置換後単語
     */
    constructor(data) {
        assert(typeof data.id === 'string');
        assert(typeof data.serverId === 'string');
        assert(typeof data.from === 'string');
        assert(typeof data.to === 'string');

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
     * 置換前単語
     *
     * @type {string}
     */
    get from() {
        return this.data.from;
    }

    /**
     * 置換後単語
     *
     * @type {string}
     */
    get to() {
        return this.data.to;
    }

    toString() {
        return `WordCreateAction(id=${this.id}, serverId=${this.serverId}, from=${this.from}, to=${this.to})`;
    }
}

module.exports = WordCreateAction;

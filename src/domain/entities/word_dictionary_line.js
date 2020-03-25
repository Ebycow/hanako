const assert = require('assert').strict;

/**
 * 花子の教育辞書の辞書置換エンティティ
 *
 * エンティティは全て読み取り専用；これをいじったからといって辞書の状態は変わらない（いじれないけど）
 */
class WordDictionaryLine {
    /**
     * WordDictionaryLineエンティティを構築する
     *
     * @param {object} data
     * @param {string} data.id エンティティID
     * @param {string} data.dictId 紐ついている辞書のID
     * @param {string} data.from 元々の単語
     * @param {string} data.to 置換後の単語
     */
    constructor(data) {
        assert(typeof data.id === 'string');
        assert(typeof data.dictId === 'string');
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
     * 親辞書のID
     *
     * @type {string}
     */
    get dictId() {
        return this.data.dictId;
    }

    /**
     * 元々の単語
     *
     * @type {string}
     */
    get from() {
        return this.data.from;
    }

    /**
     * 置換後の単語
     *
     * @type {string}
     */
    get to() {
        return this.data.to;
    }

    /**
     * (impl) Pager.Lineable
     *
     * @type {string}
     */
    get line() {
        return `${this.from} ⇨ ${this.to}`;
    }

    toString() {
        return `WordDictionaryLine(id=${this.id}, dictId=${this.dictId}, from=${this.from}, to=${this.to}, line=${this.line})`;
    }
}

module.exports = WordDictionaryLine;

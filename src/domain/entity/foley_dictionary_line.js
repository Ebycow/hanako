const assert = require('assert').strict;

/**
 * 花子のSE辞書の一項目を表すエンティティ
 */
class FoleyDictionaryLine {
    /**
     * FoleyDictionaryLineエンティティを構築する
     *
     * @param {object} data
     * @param {string} data.id エンティティID
     * @param {string} data.dictId 紐ついている辞書のID
     * @param {string} data.keyword SEに対応するキーワード
     * @param {string} data.url SE音源データのURL
     */
    constructor(data) {
        assert(typeof data.id === 'string');
        assert(typeof data.dictId === 'string');
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
     * 親辞書のID
     *
     * @type {string}
     */
    get dictId() {
        return this.data.dictId;
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
     * SE音源データのURL
     *
     * @type {string}
     */
    get url() {
        return this.data.url;
    }

    /**
     * (impl) Pager.Lineable
     *
     * @type {string}
     */
    get line() {
        return `${this.keyword} ⇨ ${this.url}`;
    }

    toString() {
        return `FoleyDictionaryLine(id=${this.id}, dictId=${this.dictId}, keyword=${this.keyword}, url=${this.url}, line=${this.line})`;
    }
}

module.exports = FoleyDictionaryLine;

const assert = require('assert').strict;
const utils = require('../../core/utils');

/** @typedef {import('./word_dictionary_line')} WordDictionaryLine */

/**
 * ソート関数
 *
 * @param {WordDictionaryLine} line1
 * @param {WordDictionaryLine} line2
 */
function compare(line1, line2) {
    const a = utils.countUnicode(line1.from);
    const b = utils.countUnicode(line2.from);
    // 降順
    return b - a;
}

/**
 * 花子の教育辞書エンティティ
 *
 * エンティティは全て読み取り専用；これをいじったからといって辞書の状態は変わらない（いじれないけど）
 */
class WordDictionary {
    /**
     * WordDictionaryエンティティを構築する
     *
     * @param {object} data
     * @param {string} data.id エンティティID
     * @param {string} data.serverId 紐ついているサーバーのID
     * @param {Array<WordDictionaryLine>} data.lines 辞書置換の配列（未ソートでOK）
     */
    constructor(data) {
        assert(typeof data.id === 'string');
        assert(typeof data.serverId === 'string');
        assert(typeof data.lines === 'object' && Array.isArray(data.lines));
        assert(data.lines.every(line => typeof line === 'object'));

        const lines = data.lines.slice();
        lines.sort(compare);

        Object.defineProperty(this, 'data', {
            value: Object.assign({}, data, { lines }),
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
     * 紐ついているサーバーのID
     *
     * @type {string}
     */
    get serverId() {
        return this.data.serverId;
    }

    /**
     * 辞書置換のリスト
     * (impl) Pager.Pageable
     *
     * @type {Array<WordDictionaryLine>}
     */
    get lines() {
        return this.data.lines.slice();
    }

    /**
     * (impl) Pager.Pageable
     *
     * @type {number}
     */
    get linesPerPage() {
        return 10;
    }

    /**
     * (impl) Pager.Pageable
     *
     * @type {string}
     */
    get descriptor() {
        return 'dictionary';
    }

    toString() {
        return `WordDictionary(id=${this.id}, serverId=${this.servreId}, lines=${this.lines}, linesPerPage=${this.linesPerPage}, descriptor=${this.descriptor})`;
    }
}

module.exports = WordDictionary;

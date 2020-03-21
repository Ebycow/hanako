const assert = require('assert').strict;
const uuid = require('uuidv4').uuid;

/**
 * 花子の教育辞書の辞書置換エンティティ
 *
 * エンティティは全て読み取り専用；これをいじったからといって辞書の状態は変わらない（いじれないけど）
 */
class WordDictionaryLine {
    /**
     * WordDictionaryLineエンティティを構築する
     *
     * @param {object} param
     * @param {?string} param.id エンティティID 省略時は新規UUIDv4
     * @param {string} param.dictId 紐ついている辞書のID
     * @param {string} param.from 元々の単語
     * @param {string} param.to 置換後の単語
     */
    constructor(param) {
        assert(typeof param.id === 'string' || typeof param.id === 'undefined');
        assert(typeof param.dictId === 'string');
        assert(typeof param.from === 'string');
        assert(typeof param.to === 'string');

        const data = {
            id: param.id || uuid(),
            dictId: param.dictId,
            from: param.from,
            to: param.to,
        };
        Object.defineProperty(this, 'data', {
            value: data,
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
     * 辞書置換を行う
     *
     * @param {string} text 置換対象テキスト
     * @returns {string} 置換後テキスト
     */
    replace(text) {
        assert(typeof text === 'string');
        return text.split(this.from).join(this.to);
    }

    toString() {
        return `Line(from=${this.from}, to=${this.to})`;
    }
}

module.exports = WordDictionaryLine;

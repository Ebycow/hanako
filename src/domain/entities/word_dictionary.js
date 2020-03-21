const assert = require('assert').strict;
const uuid = require('uuidv4').uuid;

/** @typedef {import('./word_dictionary_line')} Line */

/**
 * ソート関数
 *
 * @param {Line} line1
 * @param {Line} line2
 */
function compare(line1, line2) {
    // バイト数ではなくコードポイントの数を数えるためのワークアラウンド
    const a = Array.from(line1.from).length;
    const b = Array.from(line2.from).length;
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
     * @param {object} param
     * @param {string?} param.id エンティティID 省略時は新規UUIDv4
     * @param {string} param.serverId 紐ついているサーバーのID
     * @param {Array<Line>} param.lines 辞書置換の配列（未ソートでOK）
     */
    constructor(param) {
        assert(typeof param.id === 'string' || typeof param.id === 'undefined');
        assert(typeof param.serverId === 'string');
        assert(typeof param.lines === 'object' && Array.isArray(param.lines));
        assert(param.lines.every(line => typeof line === 'object'));

        const lines = param.lines.slice();
        lines.sort(compare);

        const data = {
            id: param.id || uuid(),
            serverId: param.serverId,
            lines,
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
     * 紐ついているサーバーのID
     *
     * @type {string}
     */
    get serverId() {
        return this.data.serverId;
    }

    /**
     * 辞書置換のリスト
     *
     * @type {Array<Line>}
     */
    get lines() {
        return this.data.lines.slice();
    }

    /**
     * 全ての辞書置換を元々の単語の文字数降順で適用
     *
     * @param {string} text 置換対象テキスト
     * @returns {string} 置換後テキスト
     */
    replaceAll(text) {
        return this.lines.reduce((acc, line) => line.replace(acc), text);
    }

    toString() {
        return `WordDictionary(lines=${this.lines})`;
    }
}

module.exports = WordDictionary;

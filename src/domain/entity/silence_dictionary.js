const assert = require('assert').strict;

/** @typedef {import('./silence_dictionary_line')} SilenceDictionaryLine */

/**
 * ソート関数
 *
 * @param {SilenceDictionaryLine} line1
 * @param {SilenceDictionaryLine} line2
 */
function compare(line1, line2) {
    // 降順
    return line2.createdAt - line1.createdAt;
}

/**
 * 花子の沈黙ユーザー辞書エンティティ
 */
class SilenceDictionary {
    /**
     * SilenceDictionaryエンティティを構築する
     *
     * @param {object} data
     * @param {string} data.id エンティティID
     * @param {string} data.serverId 紐ついているDiscordサーバーのID
     * @param {Array<SilenceDictionaryLine>} data.lines 沈黙ユーザー行の配列（未ソートでOK）
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
     * 紐ついているDiscordサーバーのID
     *
     * @type {string}
     */
    get serverId() {
        return this.data.serverId;
    }

    /**
     * 沈黙ユーザー行のリスト
     * (impl) Pager.Pageable
     *
     * @type {Array<SilenceDictionaryLine>}
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
        return 3;
    }

    /**
     * (impl) Pager.Pageable
     *
     * @type {string}
     */
    get descriptor() {
        return '読み上げていないユーザーの一覧だよ！';
    }

    toString() {
        return `SilenceDictionary(id=${this.id}, serverId=${this.servreId}, lines=${this.lines}, linesPerPage=${this.linesPerPage}, descriptor=${this.descriptor})`;
    }
}

module.exports = SilenceDictionary;

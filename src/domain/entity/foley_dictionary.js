const assert = require('assert').strict;
const utils = require('../../core/utils');

/** @typedef {import('./foley_dictionary_line')} FoleyDictionaryLine */

/**
 * ソート関数
 *
 * @param {FoleyDictionaryLine} line1
 * @param {FoleyDictionaryLine} line2
 */
function compare(line1, line2) {
    const a = utils.countUnicode(line1.keyword);
    const b = utils.countUnicode(line2.keyword);
    // 降順
    return b - a;
}

/**
 * 花子のSE辞書エンティティ
 */
class FoleyDictionary {
    /**
     * FoleyDictionaryエンティティを構築する
     *
     * @param {object} data
     * @param {string} data.id エンティティID
     * @param {string} data.serverId 紐ついているDiscordサーバーのID
     * @param {Array<FoleyDictionaryLine>} data.lines SE行の配列（未ソートでOK）
     */
    constructor(data) {
        assert(typeof data.id === 'string');
        assert(typeof data.serverId === 'string');
        assert(typeof data.lines === 'object' && Array.isArray(data.lines));
        assert(data.lines.every((line) => typeof line === 'object'));

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
     * SE行のリスト
     * (impl) Pager.Pageable
     *
     * @type {Array<FoleyDictionaryLine>}
     */
    get lines() {
        return this.data.lines.slice();
    }

    /**
     * 読み上げ文と照合するためのSEキーワード
     * 読み上げ文は文字種統一済みなので、キーワードも文字種をそろえてから長い順に並べる。
     * 重なる場合は長いSE名を優先する。
     *
     * @type {Array<{line: FoleyDictionaryLine, keyword: string}>}
     */
    get readingKeywords() {
        return this.data.lines
            .map((line) => ({ line, keyword: utils.unifyCharacterWidth(line.keyword) }))
            .sort((a, b) => utils.countUnicode(b.keyword) - utils.countUnicode(a.keyword));
    }

    /**
     * (impl) Pager.Pageable
     *
     * @type {number}
     */
    get linesPerPage() {
        return 5;
    }

    /**
     * (impl) Pager.Pageable
     *
     * @type {string}
     */
    get descriptor() {
        return '登録されているSEの一覧だよ！';
    }

    toString() {
        return `FoleyDictionary(id=${this.id}, serverId=${this.servreId}, lines=${this.lines}, linesPerPage=${this.linesPerPage}, descriptor=${this.descriptor})`;
    }
}

module.exports = FoleyDictionary;

const assert = require('assert').strict;

/**
 * (in Pager) 一行分の文字列表現をもつインターフェース
 *
 * @typedef Lineable
 * @type {object}
 * @property {string} line 一行分の文字列表現
 */

/**
 * (in Pager) ページ可能なインターフェース
 *
 * @typedef Pageable
 * @type {object}
 * @property {Array<Lineable>} lines 全行
 * @property {number} linesPerPage 1ページあたり行数
 * @property {string} descriptor Pegableとして一意なディスクリプタ
 */

/**
 * ドメインモデル
 * ページ管理
 */
class Pager {
    /**
     * Pagerモデルを構築する
     *
     * @param {Pageable} pageable ページ管理する対象
     * @param {number} [currentIndex=1] オリジン1のページインデックス
     */
    constructor(pageable, currentIndex = 1) {
        assert(typeof pageable === 'object');
        assert(typeof pageable.lines === 'object' && Array.isArray(pageable.lines));
        assert(pageable.lines.every(liner => typeof liner === 'object'));
        assert(pageable.lines.every(liner => typeof liner.line === 'string'));
        assert(typeof pageable.linesPerPage === 'number' && Number.isInteger(pageable.linesPerPage));
        assert(pageable.linesPerPage >= 1);
        assert(typeof pageable.descriptor === 'string');
        assert(typeof currentIndex === 'number' && Number.isInteger(currentIndex));
        assert(currentIndex >= 1);

        this.pageable = pageable;
        this.linesPerPage = pageable.linesPerPage;
        this.descriptor = pageable.descriptor;
        this.currentIndex = currentIndex;
    }

    /**
     * オリジン1の最終インデックス
     *
     * @type {number}
     */
    get lastIndex() {
        return Math.ceil(this.pageable.lines.length / this.linesPerPage);
    }

    /**
     * ページおくり
     */
    forward() {
        if (this.currentIndex === this.lastIndex) {
            // すでに最終ページの時、何もしない
            return;
        }
        this.currentIndex += 1;
    }

    /**
     * ページもどし
     */
    backward() {
        if (this.currentIndex === 1) {
            // オリジンより前には戻らない
            return;
        }
        this.currentIndex -= 1;
    }

    /**
     * 現在のページインデックスに対応する行
     *
     * @returns {Array<Lineable>}
     */
    lineables() {
        const offset = this.linesPerPage * (this.currentIndex - 1);
        return this.pageable.lines.slice(offset, offset + this.linesPerPage);
    }

    /**
     * 現在のページを文字列表現にする
     *
     * @returns {string}
     */
    show() {
        const lines = this.lineables().map(v => v.line);
        const s1 = `${this.descriptor} ${this.currentIndex} / ${this.lastIndex} page`;
        const s2 = '─────────────────────';
        const sL = '─────────────────────';
        return [s1, s2, ...lines, sL].join('\n');
    }
}

module.exports = Pager;

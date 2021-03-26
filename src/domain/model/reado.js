const assert = require('assert').strict;
const readers = require('./readers');
const Plain = require('../entity/audios/plain');

/** @typedef {import('../entity/audios').AudioT} AudioT */
/** @typedef {import('../model/hanako')} Hanako */

/**
 * ドメインモデル
 * リードー
 *
 * コマンドーと語感を合わせたらこうなってしまった
 * 後悔はしていない😩
 */
class Reado {
    /**
     * リードーを構築
     *
     * @param {Hanako} hanako Reader適用下の読み上げ花子モデル
     */
    constructor(hanako) {
        const lifters = readers.sorted.map(R => R.prototype.read.bind(new R(hanako)));
        this.squash = z => lifters.reduce((arr, f) => arr.map(f).flat(), [z]);
    }

    /**
     * テキストに各Readerクラスの処理を適用し、音声変換手続きの配列を構築する。
     *
     * @param {string} text 読み上げるテキスト
     * @returns {Array<AudioT>} 変換手続きの配列
     */
    compose(text) {
        assert(typeof text === 'string');

        // 最初の入力としてPlainを渡す
        const plain = new Plain({ content: text });

        // 構築結果からNoopを除去する
        const arr = this.squash(plain).filter(v => v.type !== 'noop');

        // Plainは残っているはずがない
        assert(arr.every(v => v.type !== 'plain'));

        return arr;
    }
}

module.exports = Reado;

const assert = require('assert').strict;
const formatters = require('./formatters');

/** @typedef {import('../model/hanako')} Hanako */

/**
 * ドメインモデル
 * ホルマト
 */
class Formato {
    /**
     * ホルマトを構築
     *
     * @param {Hanako} hanako Formatter適用下の読み上げ花子モデル
     */
    constructor(hanako) {
        const formats = formatters.sorted.map(F => F.prototype.format.bind(new F(hanako)));
        this.fold = z => formats.reduce((acc, f) => f(acc), z);
    }

    /**
     * テキストに各Formatterクラスの処理を適用し、正規化されたテキストを返す。
     *
     * @param {string} text 元のテキスト
     * @returns {string} 正規化されたテキスト
     */
    normalize(text) {
        assert(typeof text === 'string');

        // 各文字列フォーマッターを適用
        return this.fold(text);
    }
}

module.exports = Formato;

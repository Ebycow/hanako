const assert = require('assert').strict;
const formatters = require('./formatters');

/** @typedef {import('../entity/server_status')} ServerStatus */

/**
 * ドメインモデル
 * ホルマト
 */
class Formato {
    /**
     * ホルマトを構築
     *
     * @param {ServerStatus} status Formatter適用下のサーバー状態
     */
    constructor(status) {
        const formats = () => formatters.sorted.map(F => F.prototype.format.bind(new F(status)));
        this.fold = z => formats().reduce((acc, f) => f(acc), z);
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

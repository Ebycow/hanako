const assert = require('assert').strict;

/**
 * Plainエンティティ
 * Plainは特別なオーディオエンティティで、Audio直和型に含まれない。
 * Plainエンティティは音声変換手続きを表すのではなく、自身が未変換のテキストということを表す。
 * 最初のReaderにPlainが渡され、各Readerを順に適用し、最終的にPlainが残らないことが全Readerクラスの統一的責任となる。
 *
 * 全適用後にPlainが残っていた場合、Reado.composeを抜ける前にアサーションが失敗する。
 * つまり本番環境ではエラーにならない。Plainを絶対に残さないための実装はTerminalReaderクラスにあり、テストで保証される。
 * これは読み上げ変換ドメインでもっとも重要な制約なので、Readerモデルに手を加える前によく理解されたし。
 */
class Plain {
    /**
     * @type {'plain'}
     */
    get type() {
        return 'plain';
    }

    /**
     * Plainエンティティを構築する
     *
     * @param {object} data
     * @param {string} data.content 読み上げ対象テキスト
     */
    constructor(data) {
        assert(typeof data.content === 'string');

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
        return Buffer.from(this.data.content).toString('base64');
    }

    /**
     * 未変換テキスト
     *
     * @type {string}
     */
    get content() {
        return this.data.content;
    }

    toString() {
        return `Plain(id=${this.id}, content=${this.content})`;
    }
}

module.exports = Plain;

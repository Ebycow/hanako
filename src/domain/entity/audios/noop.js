/**
 * Noopエンティティ
 * Noopは特別なオーディオエンティティで、Audio直和型に含まれない。
 * 各Readerクラスで内部的に利用され、読み上げ対象テキストに対応する変換手続きのないこと（無視すること）を表現する。
 * NoopエンティティはReado.composeを抜ける直前にすべて除去され、文字とおりなかったコトにされる。
 */
class Noop {
    /**
     * @type {'noop'}
     */
    get type() {
        return 'noop';
    }

    /**
     * Noopエンティティを構築する
     */
    constructor() {}

    /**
     * エンティティID
     *
     * @type {string}
     */
    get id() {
        return '0';
    }

    toString() {
        return 'Noop()';
    }
}

module.exports = Noop;

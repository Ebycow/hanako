const assert = require('assert').strict;

/**
 * レスポンスエンティティ
 * テキストデータを投稿するレスポンス
 */
class TextResponse {
    /**
     * @type {'text'}
     */
    get type() {
        return 'text';
    }

    /**
     * @param {object} param
     * @param {string} param.content テキスト内容
     * @param {'success'|'error'} [param.code='success'] レスポンスコード
     */
    constructor({ content, code = 'success' }) {
        assert(typeof content === 'string' && content.length > 0);
        assert(code === 'success' || code === 'error');

        const data = { content, code };
        Object.defineProperty(this, 'data', {
            value: data,
            writable: false,
            enumerable: true,
            configurable: false,
        });
    }

    /**
     * テキストの内容
     *
     * @type {string}
     */
    get content() {
        return this.data.content;
    }

    /**
     * レスポンスコード
     *
     * @type {'success'|'error'}
     */
    get code() {
        return this.data.code;
    }

    toString() {
        return `TextResponse(content=${this.content}, code=${this.code})`;
    }
}

module.exports = TextResponse;

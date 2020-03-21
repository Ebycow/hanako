const assert = require('assert').strict;

/**
 * レスポンスエンティティ
 * ディスコードに会話を投稿するレスポンス
 */
class ChatResponse {
    /**
     * @type {'chat'}
     */
    get type() {
        return 'chat';
    }

    /**
     * ChatResponseエンティティを構築する
     *
     * @param {object} param
     * @param {string} param.id エンティティID
     * @param {string} param.content テキスト内容
     * @param {string} channelId 投稿先チャンネルID
     * @param {'simple'|'pager'|'error'} [param.code='simple'] 会話コード
     */
    constructor({ id, content, channelId, code = 'simple' }) {
        assert(typeof id === 'string');
        assert(typeof content === 'string' && content.length > 0);
        assert(typeof channelId === 'string');
        assert(code === 'simple' || code === 'pager' || code === 'error');

        const data = { id, content, channelId, code };
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
     * テキストの内容
     *
     * @type {string}
     */
    get content() {
        return this.data.content;
    }

    /**
     * 会話コード
     *
     * @type {'simple'|'pager'|'error'}
     */
    get code() {
        return this.data.code;
    }

    /**
     * 投稿先チャネルID
     *
     * @type {string}
     */
    get channelId() {
        return this.data.channelId;
    }

    toString() {
        return `ChatResponse(content=${this.content}, code=${this.code})`;
    }
}

module.exports = ChatResponse;

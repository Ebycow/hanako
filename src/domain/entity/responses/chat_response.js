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
     * @param {object} data
     * @param {string} data.id エンティティID
     * @param {string} data.content テキスト内容
     * @param {string} data.channelId 投稿先チャンネルID
     * @param {'simple'|'pager'|'force'|'error'} data.code 会話コード
     */
    constructor(data) {
        assert(typeof data.id === 'string');
        assert(typeof data.content === 'string' && data.content.length > 0);
        assert(typeof data.channelId === 'string');
        assert(data.code === 'simple' || data.code === 'pager' || data.code === 'force' || data.code === 'error');

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
     * @type {'simple'|'pager'|'force'|'error'}
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

    /**
     * エラー情報を結合する
     * - 自身の会話コードがerror以外の時は何もしない
     *
     * @param {any} error エラーオブジェクト
     * @returns {ChatResponse} エラー情報結合済みインスタンス
     */
    withError(error) {
        if (error.eby && this.code === 'error') {
            return new ChatResponse({
                id: this.id,
                content: this.content + '\n' + error.message,
                channelId: this.channelId,
                code: 'error',
            });
        }
        return this;
    }

    toString() {
        return `ChatResponse(id=${this.id}, content=${this.content}, code=${this.code}, channelId=${this.channelId})`;
    }
}

module.exports = ChatResponse;

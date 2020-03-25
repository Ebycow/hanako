const assert = require('assert').strict;
const ChatResponse = require('./responses/chat_response');

/** @typedef {import('./discord_message')} DiscordMessage */

/**
 * エンティティ
 * コマンドの引数
 */
class CommandInput {
    /**
     * コマンド引数のパースを試みる 失敗時はTypeError
     *
     * @param {DiscordMessage} dmessage パースするメッセージ
     * @param {string} [prefix=null] プリフィクス('>')が有効なら渡す nullならチェックしない
     * @return {CommandInput} パースされたコマンド引数
     */
    static tryParse(dmessage, prefix = null) {
        assert(typeof dmessage === 'object');
        assert(typeof prefix === 'string' || prefix === null);

        let parts = dmessage.content.split(/[\s　]+/); // eslint-disable-line

        if (parts[0].startsWith('@')) {
            parts = parts.slice(1);
        } else if (prefix && parts[0].startsWith(prefix)) {
            parts[0] = parts[0].slice(prefix.length);
        } else {
            throw new TypeError('コマンド指定形式が見つからない');
        }

        if (!(parts.length > 0) || !parts.every(x => x.length > 0)) {
            throw new TypeError('コマンドのパースに失敗');
        }

        return new CommandInput({ id: dmessage.id, argc: parts.length, argv: parts, origin: dmessage });
    }

    /**
     * CommandInputエンティティを構築
     *
     * @param {object} data
     * @param {string} data.id エンティティID
     * @param {number} data.argc 引数の数
     * @param {string[]} data.argv 引数の配列
     * @param {DiscordMessage} data.origin 元となったDiscordMessageエンティティ
     */
    constructor(data) {
        assert(typeof data.id === 'string');
        assert(typeof data.argc === 'number' && Number.isInteger(data.argc) && data.argc >= 0);
        assert(Array.isArray(data.argv) && data.argv.length === data.argc);
        assert(data.argv.every(x => typeof x === 'string'));
        assert(typeof data.origin === 'object');

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
     * 引数の個数
     *
     * @type {number}
     */
    get argc() {
        return this.data.argc;
    }

    /**
     * 引数の配列
     *
     * @type {[string]}
     */
    get argv() {
        return this.data.argv.slice();
    }

    /**
     * 元になったDiscordMessage
     *
     * @type {DiscordMessage}
     */
    get origin() {
        return this.data.origin;
    }

    /**
     * コマンド引数を１つ消費した新しいエンティティを返す
     *
     * @returns {CommandInput} 1番目の引数が消費されたCommandInput
     */
    consume() {
        if (this.argc === 0) {
            return this;
        }
        return new CommandInput({ id: this.id, argc: this.argc - 1, argv: this.argv.slice(1), origin: this.origin });
    }

    /**
     * コマンド送信者に向けた新しい会話レスポンスを生成
     *
     * @param {string} content 内容
     * @param {'simple'|'pager'|'force'|'error'} code 会話コード
     * @returns {ChatResponse}
     */
    newChatResponse(content, code = 'simple') {
        assert(typeof content === 'string');
        assert(code === 'simple' || code === 'pager' || code === 'force' || code === 'error');

        return new ChatResponse({
            id: this.id,
            content,
            channelId: this.origin.channelId,
            code,
        });
    }

    toString() {
        return `CommandInput(id=${this.id}, argc=${this.argc}, argv=${this.argv}, origin=${this.origin})`;
    }
}

module.exports = CommandInput;

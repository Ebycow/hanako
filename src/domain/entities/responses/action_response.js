const assert = require('assert').strict;
const SilentResponse = require('./silent_response');

/** @typedef {import('../actions/_action')} Action */
/** @typedef {import('./_response')} Response */

/**
 * レスポンスエンティティ
 * 任意のアクションを実行するレスポンス
 * ほかのレスポンス型と異なり再帰的にレスポンスを指定する
 */
class ActionResponse {
    /**
     * @type {'action'}
     */
    get type() {
        return 'action';
    }

    /**
     * ActionResponseエンティティを構築
     *
     * @param {object} data
     * @param {string} data.id エンティティID
     * @param {Action} data.action 実行するアクション
     * @param {Response} [data.onSuccess=SilentResponse] アクション成功時に履行するレスポンス 省略時はSilentResponse
     * @param {Response} [data.onFailure=SilentResponse] アクション失敗時に履行するレスポンス 省略時はSilentResponse
     */
    constructor(data) {
        assert(typeof data.id === 'string');
        assert(typeof data.action === 'object');

        const onSuccess = data.onSuccess || new SilentResponse();
        const onFailure = data.onFailure || new SilentResponse();

        Object.defineProperty(this, 'data', {
            value: Object.assign({}, data, { onSuccess, onFailure }),
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
     * 実行するアクション
     *
     * @type {Action}
     */
    get action() {
        return this.data.action;
    }

    /**
     * アクション成功時に履行するレスポンス
     *
     * @type {Response}
     */
    get onSuccess() {
        return this.data.onSuccess;
    }

    /**
     * アクション失敗時に履行するレスポンス
     *
     * @type {Response}
     */
    get onFailure() {
        return this.data.onFailure;
    }

    toString() {
        return `ActionResponse(action=${this.action}, onSuccess=${this.onSuccess}, onFailure=${this.onFailure})`;
    }
}

module.exports = ActionResponse;

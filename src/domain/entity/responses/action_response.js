const assert = require('assert').strict;
const SilentResponse = require('./silent_response');

/** @typedef {import('../actions').ActionT} ActionT */
/** @typedef {import('.').ResponseT} ResponseT */

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
     * @param {ActionT} data.action 実行するアクション
     * @param {ResponseT|function(*):ResponseT} [data.onSuccess=SilentResponse] アクション成功時に履行するレスポンス 省略時はSilentResponse
     *        関数なら、アクションの結果を受け取ってレスポンスを返す
     * @param {ResponseT} [data.onFailure=SilentResponse] アクション失敗時に履行するレスポンス 省略時はSilentResponse
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
     * @type {ActionT}
     */
    get action() {
        return this.data.action;
    }

    /**
     * アクション成功時に履行するレスポンス
     *
     * @type {ResponseT}
     */
    get onSuccess() {
        return this.data.onSuccess;
    }

    /**
     * アクション失敗時に履行するレスポンス
     *
     * @type {ResponseT}
     */
    get onFailure() {
        return this.data.onFailure;
    }

    /**
     * 成功時に処理するレスポンス
     * onSuccess に関数を渡したときは、アクションの結果を渡して作る（照合した話者の名前を伝えるときなど）
     *
     * @param {*} result アクションの結果
     * @returns {import('./index').ResponseT}
     */
    successResponse(result) {
        return typeof this.onSuccess === 'function' ? this.onSuccess(result) : this.onSuccess;
    }

    toString() {
        const onSuccess = typeof this.onSuccess === 'function' ? '(result => Response)' : this.onSuccess;
        return `ActionResponse(id=${this.id}, action=${this.action}, onSuccess=${onSuccess}, onFailure=${this.onFailure})`;
    }
}

module.exports = ActionResponse;

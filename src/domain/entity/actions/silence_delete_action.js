const assert = require('assert').strict;

/**
 * 沈黙削除アクションのエンティティ
 */
class SilenceDeleteAction {
    /**
     * @type {'silence_delete'}
     */
    get type() {
        return 'silence_delete';
    }

    /**
     * SilenceDeleteActionエンティティを構築
     *
     * @param {object} data
     * @param {string} data.id エンティティID
     * @param {string} data.serverId 対象DiscordサーバーのID
     * @param {string} data.silenceId 削除する沈黙のID
     */
    constructor(data) {
        assert(typeof data.id === 'string');
        assert(typeof data.serverId === 'string');
        assert(typeof data.silenceId === 'string');

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
     * 対象DiscordサーバーのID
     *
     * @type {string}
     */
    get serverId() {
        return this.data.serverId;
    }

    /**
     * 削除する沈黙のID
     *
     * @type {string}
     */
    get silenceId() {
        return this.data.silenceId;
    }

    toString() {
        return `SilenceDeleteAction(id=${this.id}, serverId=${this.serverId}, silenceId=${this.silenceId})`;
    }
}

module.exports = SilenceDeleteAction;

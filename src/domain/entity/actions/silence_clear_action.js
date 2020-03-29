const assert = require('assert').strict;

/**
 * 沈黙初期化アクションのエンティティ
 */
class SilenceClearAction {
    /**
     * @type {'silence_clear'}
     */
    get type() {
        return 'silence_clear';
    }

    /**
     * SilenceClearActionエンティティを構築
     *
     * @param {object} data
     * @param {string} data.id エンティティID
     * @param {string} data.serverId 初期化するDiscordサーバーのID
     */
    constructor(data) {
        assert(typeof data.id === 'string');
        assert(typeof data.serverId === 'string');

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
     * 初期化するDiscordサーバーのID
     *
     * @type {string}
     */
    get serverId() {
        return this.data.serverId;
    }

    toString() {
        return `SilenceClearAction(id=${this.id}, serverId=${this.serverId})`;
    }
}

module.exports = SilenceClearAction;

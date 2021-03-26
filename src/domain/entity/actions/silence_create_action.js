const assert = require('assert').strict;

/**
 * 沈黙追加アクションのエンティティ
 */
class SilenceCreateAction {
    /**
     * @type {'silence_create'}
     */
    get type() {
        return 'silence_create';
    }

    /**
     * SilenceCreateActionエンティティを構築
     *
     * @param {object} data
     * @param {string} data.id エンティティID
     * @param {string} data.serverId 対象DiscordサーバーのID
     * @param {string} data.userId 沈黙させるユーザーのID
     */
    constructor(data) {
        assert(typeof data.id === 'string');
        assert(typeof data.serverId === 'string');
        assert(typeof data.userId === 'string');

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
     * 沈黙させるユーザーのID
     *
     * @type {string}
     */
    get userId() {
        return this.data.userId;
    }

    toString() {
        return `SilenceCreateAction(id=${this.id}, serverId=${this.serverId}, userId=${this.userId})`;
    }
}

module.exports = SilenceCreateAction;

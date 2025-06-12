const assert = require('assert').strict;

/**
 * SE追加アクションのエンティティ
 */
class FoleyRenameAction {
    /**
     * @type {'foley_rename'}
     */
    get type() {
        return 'foley_rename';
    }

    /**
     * FoleyCreateActionエンティティを構築
     *
     * @param {object} data
     * @param {string} data.id エンティティID
     * @param {string} data.serverId 対象DiscordサーバーのID
     * @param {string} data.keywordFrom SEに対応するキーワード（元）
     * @param {string} data.keywordTo SEに対応するキーワード（先）
     */
    constructor(data) {        
        assert(typeof data.id === 'string');
        assert(typeof data.serverId === 'string');
        assert(typeof data.keywordFrom === 'string');
        assert(typeof data.keywordTo === 'string');

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
     * SEに対応するキーワード
     *
     * @type {string}
     */
    get keywordFrom() {
        return this.data.keywordFrom;
    }

    /**
     * SEに対応するキーワード
     *
     * @type {string}
     */
    get keywordTo() {
        return this.data.keywordTo;
    }

    toString() {
        return `FoleyRenameAction(id=${this.id}, serverId=${this.serverId}, keywordFrom=${this.keywordFrom}, keywordTo=${this.keywordTo})`;
    }
}

module.exports = FoleyRenameAction;

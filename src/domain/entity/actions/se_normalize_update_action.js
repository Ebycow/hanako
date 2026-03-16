const assert = require('assert').strict;

/**
 * アクション
 * SE正規化更新
 */
class SeNormalizeUpdateAction {
    /**
     * アクションタイプ
     *
     * @type {string}
     */
    get type() {
        return 'se_normalize_update';
    }

    /**
     * SeNormalizeUpdateActionを構築
     *
     * @param {object} data
     * @param {string} data.id エンティティID
     * @param {string} data.serverId DiscordサーバーID
     * @param {number} data.seNormalize SE正規化レベル（0〜100）
     */
    constructor(data) {
        assert(typeof data.id === 'string');
        assert(typeof data.serverId === 'string');
        assert(typeof data.seNormalize === 'number' && Number.isInteger(data.seNormalize));
        assert(data.seNormalize >= 0 && data.seNormalize <= 100);

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
     * DiscordサーバーID
     *
     * @type {string}
     */
    get serverId() {
        return this.data.serverId;
    }

    /**
     * SE正規化レベル（0〜100）
     *
     * @type {number}
     */
    get seNormalize() {
        return this.data.seNormalize;
    }

    toString() {
        return `SeNormalizeUpdateAction(id=${this.id}, serverId=${this.serverId}, seNormalize=${this.seNormalize})`;
    }
}

module.exports = SeNormalizeUpdateAction;

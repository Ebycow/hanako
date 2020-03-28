const assert = require('assert').strict;

/**
 * エンティティ
 * 読み上げ花子の設定
 */
class Settings {
    /**
     * Settingsエンティティを構築
     *
     * @param {object} data
     * @param {string} data.id エンティティID
     * @param {string} data.serverId DiscordサーバーID
     * @param {number} data.maxCount 最大読み上げ文字数
     */
    constructor(data) {
        assert(typeof data.id === 'string');
        assert(typeof data.serverId === 'string');
        assert(typeof data.maxCount === 'number' && Number.isInteger(data.maxCount) && data.maxCount >= 0);

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
     * 最大読み上げ文字数
     *
     * @type {number}
     */
    get maxCount() {
        return this.data.maxCount;
    }

    toString() {
        return `Settings(id=${this.id}, serverId=${this.serverId}, maxCount=${this.maxCount})`;
    }
}

module.exports = Settings;

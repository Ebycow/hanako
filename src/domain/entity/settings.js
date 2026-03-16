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
     * @param {{ userId : string , name : string }} data.speaker サーバーの読み上げキャラクター指定
     * @param {number} [data.seNormalize=0.5] SE正規化レベル（0.0〜1.0、デフォルト0.5）
     */
    constructor(data) {
        assert(typeof data.id === 'string');
        assert(typeof data.serverId === 'string');
        assert(typeof data.maxCount === 'number' && Number.isInteger(data.maxCount) && data.maxCount >= 0);
        assert(typeof data.speaker === 'object');

        // seNormalizeはオプショナル（既存レコード互換のためデフォルト値を設定）
        const seNormalize = data.seNormalize !== undefined ? data.seNormalize : 0.5;
        assert(typeof seNormalize === 'number' && seNormalize >= 0.0 && seNormalize <= 1.0);

        Object.defineProperty(this, 'data', {
            value: Object.assign({}, data, { seNormalize }),
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

    /**
     * サーバーの読み上げキャラクター指定
     *
     * @type {string}
     */
    get speaker() {
        return this.data.speaker;
    }

    /**
     * SE正規化レベル（0.0〜1.0）
     *
     * @type {number}
     */
    get seNormalize() {
        return this.data.seNormalize;
    }

    toString() {
        return `Settings(id=${this.id}, serverId=${this.serverId}, maxCount=${this.maxCount}, speaker=${this.speaker}, seNormalize=${this.seNormalize})`;
    }
}

module.exports = Settings;

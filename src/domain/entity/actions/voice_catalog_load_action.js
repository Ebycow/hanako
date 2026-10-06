const assert = require('assert').strict;

/**
 * 読み上げキャラクター一覧読み込みアクションのエンティティ
 * 成功すると VoiceCatalog を結果として返す
 */
class VoiceCatalogLoadAction {
    /**
     * @type {'voice_catalog_load'}
     */
    get type() {
        return 'voice_catalog_load';
    }

    /**
     * VoiceCatalogLoadActionエンティティを構築
     *
     * @param {object} data
     * @param {string} data.id エンティティID
     */
    constructor(data) {
        assert(typeof data.id === 'string');

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

    toString() {
        return `VoiceCatalogLoadAction(id=${this.id})`;
    }
}

module.exports = VoiceCatalogLoadAction;

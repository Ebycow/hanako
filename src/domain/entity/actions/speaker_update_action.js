const assert = require('assert').strict;

/**
 * キャラクター名更新アクションのエンティティ
 */
class SpeakerUpdateAction {
    /**
     * @type {'speaker_update'}
     */
    get type() {
        return 'speaker_update';
    }

    /**
     * キャラクター名更新エンティティを構築
     *
     * @param {object} data
     * @param {string} data.id エンティティID
     * @param {string} data.serverId 対象DiscordサーバーのID
     * @param {number} data.speaker 新しい読み上げキャラクター名
     */
    constructor(data) {
        assert(typeof data.id === 'string');
        assert(typeof data.serverId === 'string');
        assert(typeof data.speaker === 'string');

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
     * 新しく設定するキャラクター名
     *
     * @type {string}
     */
    get speaker() {
        return this.data.speaker;
    }

    toString() {
        return `SpeakerAction(id=${this.id}, serverId=${this.serverId}, speaker=${this.speaker})`;
    }
}

module.exports = SpeakerUpdateAction;

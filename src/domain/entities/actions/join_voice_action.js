const assert = require('assert').strict;

/**
 * VC参加アクションのエンティティ
 */
class JoinVoiceAction {
    /**
     * @type {'join_voice'}
     */
    get type() {
        return 'join_voice';
    }

    /**
     * @type {'discord'}
     */
    get category() {
        return 'discord';
    }

    /**
     * JoinVoiceActionエンティティを構築
     *
     * @param {object} data
     * @param {string} data.id エンティティID
     * @param {string} data.voiceChannelId 対象の音声チャンネルID
     * @param {string} data.textChannelId 読み上げ対象のテキストチャネルID
     */
    constructor(data) {
        assert(typeof data.id === 'string');
        assert(typeof data.voiceChannelId === 'string');
        assert(typeof data.textChannelId === 'string');

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
     * 参加対象の音声チャンネルID
     *
     * @type {string}
     */
    get voiceChannelId() {
        return this.data.voiceChannelId;
    }

    /**
     * 読み上げ対象のテキストチャンネルID
     *
     * @type {string}
     */
    get textChannelId() {
        return this.data.textChannelId;
    }

    toString() {
        return `JoinVoiceAction()`;
    }
}

module.exports = JoinVoiceAction;

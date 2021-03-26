const assert = require('assert').strict;

/**
 * VC退出アクションのエンティティ
 */
class LeaveVoiceAction {
    /**
     * @type {'leave_voice'}
     */
    get type() {
        return 'leave_voice';
    }

    /**
     * LeaveVoiceActionエンティティを構築
     *
     * @param {object} data
     * @param {string} data.id エンティティID
     * @param {string} data.serverId VC退出するDiscordサーバーのID
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
     * VC退出するDiscordサーバーのID
     *
     * @type {string}
     */
    get serverId() {
        return this.data.serverId;
    }

    toString() {
        return `LeaveVoiceAction(id=${this.id}, serverId=${this.serverId})`;
    }
}

module.exports = LeaveVoiceAction;

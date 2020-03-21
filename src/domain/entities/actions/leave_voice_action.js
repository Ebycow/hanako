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
     * @type {'discord'}
     */
    get category() {
        return 'discord';
    }

    /**
     * LeaveVoiceActionエンティティを構築
     *
     * @param {object} data
     * @param {string} data.id エンティティID
     * @param {string} data.serverId VC退出するサーバーのID
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

    /**
     * VC退出するサーバーのID
     *
     * @type {string}
     */
    get serverId() {
        return this.data.serverId;
    }

    toString() {
        return `LeaveVoiceAction()`;
    }
}

module.exports = LeaveVoiceAction;

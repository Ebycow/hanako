const assert = require('assert').strict;

/**
 * アクション
 * テキストコマンドの有効・無効の更新
 */
class TextCommandsUpdateAction {
    /**
     * アクションタイプ
     *
     * @type {string}
     */
    get type() {
        return 'text_commands_update';
    }

    /**
     * TextCommandsUpdateActionを構築
     *
     * @param {object} data
     * @param {string} data.id エンティティID
     * @param {string} data.serverId DiscordサーバーID
     * @param {boolean} data.enabled テキストコマンドを使えるようにするか
     */
    constructor(data) {
        assert(typeof data.id === 'string');
        assert(typeof data.serverId === 'string');
        assert(typeof data.enabled === 'boolean');

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
     * テキストコマンドを使えるようにするか
     *
     * @type {boolean}
     */
    get enabled() {
        return this.data.enabled;
    }

    toString() {
        return `TextCommandsUpdateAction(id=${this.id}, serverId=${this.serverId}, enabled=${this.enabled})`;
    }
}

module.exports = TextCommandsUpdateAction;

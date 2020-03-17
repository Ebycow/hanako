const assert = require('assert').strict;

class DiscordMessage {
    /**
     * @param {object} data
     * @param {string} data.id
     * @param {string} data.content
     * @param {'command'|'read'} data.type
     */
    constructor(data) {
        assert(typeof data.id === 'string');
        assert(typeof data.content === 'string');
        assert(data.type === 'command' || data.type === 'read');

        Object.defineProperty(this, 'data', {
            value: data,
            writable: false,
            enumerable: true,
            configurable: false,
        });
    }

    /**
     * @type {string}
     */
    get id() {
        return this.data.id;
    }

    /**
     * @type {string}
     */
    get content() {
        return this.data.content;
    }

    /**
     * @type {'command'|'read'}
     */
    get type() {
        return this.data.type;
    }

    toString() {
        return `DiscordMessage(type=${this.type}, content=${this.content})`;
    }
}

module.exports = DiscordMessage;

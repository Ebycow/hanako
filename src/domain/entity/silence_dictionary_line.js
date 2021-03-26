const assert = require('assert').strict;

/**
 * 花子の沈黙ユーザー辞書の一項目を表すエンティティ
 */
class SilenceDictionaryLine {
    /**
     * SilenceDictionaryLineエンティティを構築する
     *
     * @param {object} data
     * @param {string} data.id エンティティID
     * @param {string} data.dictId 紐ついている辞書のID
     * @param {string} data.userId 沈黙ユーザーのID
     * @param {Date} data.createdAt 沈黙開始日時
     */
    constructor(data) {
        assert(typeof data.id === 'string');
        assert(typeof data.dictId === 'string');
        assert(typeof data.userId === 'string');
        assert(typeof data.createdAt === 'object');

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
     * 親辞書のID
     *
     * @type {string}
     */
    get dictId() {
        return this.data.dictId;
    }

    /**
     * 沈黙ユーザーのID
     *
     * @type {string}
     */
    get userId() {
        return this.data.userId;
    }

    /**
     * 沈黙開始日時
     *
     * @type {Date}
     */
    get createdAt() {
        return this.data.createdAt;
    }

    /**
     * (impl) Pager.Lineable
     *
     * @type {string}
     */
    get line() {
        const month = this.createdAt.getMonth() + 1;
        const dateFormat = `${this.createdAt.getFullYear()}年${month}月${this.createdAt.getDate()}日`;
        return `<@${this.userId}> (${dateFormat}から)`;
    }

    toString() {
        return `SilenceDictionaryLine(id=${this.id}, dictId=${this.dictId}, userId=${this.userId}, createdAt=${this.createdAt}, line=${this.line})`;
    }
}

module.exports = SilenceDictionaryLine;

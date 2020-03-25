/**
 * レスポンスエンティティ
 * 何もせずに終了するレスポンス
 */
class SilentResponse {
    /**
     * @type {'silent'}
     */
    get type() {
        return 'silent';
    }

    /**
     * SilentResponseエンティティを構築
     */
    constructor() {}

    /**
     * エンティティID
     *
     * @type {string}
     */
    get id() {
        return '0';
    }

    toString() {
        return 'SilentResponse()';
    }
}

module.exports = SilentResponse;

/**
 * 花子のレスポンスエンティティの直和型
 *
 * JSDocのための定義なので、実際に require で参照しないこと。
 */
class Response {
    // TODO テスト用の

    /**
     * レスポンスタイプ
     *
     * @type {'text'}
     */
    get type() {
        throw new Error('unreachable');
    }

    constructor() {
        throw new Error('unreachable');
    }
}

module.exports = Response;

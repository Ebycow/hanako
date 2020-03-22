/**
 * 花子のアクションエンティティの直和型
 *
 * JSDocのための定義なので、実際に require で参照しないこと。
 */
class Action {
    // TODO テスト用の

    /**
     * アクションタイプ
     *
     * @type {'join_voice'|'leave_voice'|'seibai'}
     */
    get type() {
        throw new Error('unreachable');
    }

    /**
     * アクションのカテゴリ
     *
     * @type {'discord'}
     */
    get category() {
        throw new Error('unreachable');
    }

    constructor() {
        throw new Error('unreachable');
    }
}

module.exports = Action;

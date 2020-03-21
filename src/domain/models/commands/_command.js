/**
 * 花子のコマンドモデルの直和型
 *
 * JSDocのための定義なので、実際に require で参照しないこと。
 */
class Command {
    // TODO テスト用の

    /**
     * コマンドタイプ
     *
     * @type {'ask', 'join'}
     */
    get type() {
        throw new Error('unreachable');
    }

    /**
     * コマンド名とエイリアス
     *
     * @type {string[]}
     */
    static get names() {
        throw new Error('unreachable');
    }

    /**
     * コマンドを処理
     *
     * @param {import('../../entities/command_input')} input
     * @returns {import('../../entities/responses/_response')}
     */
    process(input) {
        throw new Error('unreachable');
    }

    constructor() {
        throw new Error('unreachable');
    }
}

module.exports = Command;

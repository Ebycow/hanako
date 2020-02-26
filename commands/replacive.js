const { MessageContext } = require('../contexts/messagecontext');

/**
 * 文字列変換受け入れ可能クラス共通インターフェイス
 *
 * @interface
 */
class Replacive {
    /**
     * @param {MessageContext} context メッセージコンテキスト
     * @param {string} text 入力テキスト
     * @returns {string} 置換後テキスト
     * @abstract
     */
    replace(context, text) {
        throw new Error('Not Implemented');
    }

    /**
     * @returns {number} `replace`メソッドが呼ばれる順番を決める優先度（より小さい数字が先）
     * @abstract
     */
    replacePriority() {
        throw new Error('Not Implemented');
    }

    /**
     * @param {object} klass 実装先クラス
     */
    static applyToClass(klass) {
        for (const prop of ['replace', 'replacePriority']) {
            Object.defineProperty(klass.prototype, prop, Object.getOwnPropertyDescriptor(Replacive.prototype, prop));
        }
    }

    static [Symbol.hasInstance](instance) {
        if (instance.replace && instance.replacePriority) {
            return true;
        } else {
            return false;
        }
    }
}

module.exports = {
    Replacive,
};

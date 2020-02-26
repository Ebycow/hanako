const { MessageContext } = require('../contexts/messagecontext');
const { AudioRequest } = require('../models/audiorequest');

/**
 * 文字列をリクエストに変換する処理の共通インターフェイス
 *
 * @interface
 */
class RequestConverter {
    /**
     * @param {MessageContext} context
     * @param {Array<string|AudioRequest>} array
     * @returns {Array<string|AudioRequest>}
     * @abstract
     */
    convert(context, array) {
        throw new Error('not implemented');
    }

    /**
     * @returns {number}
     * @abstract
     */
    convertPriority() {
        throw new Error('not implemented');
    }

    /**
     * @param {object} klass 実装先クラス
     */
    static applyToClass(klass) {
        for (const prop of ['convert', 'convertPriority']) {
            Object.defineProperty(
                klass.prototype,
                prop,
                Object.getOwnPropertyDescriptor(RequestConverter.prototype, prop)
            );
        }
    }

    static [Symbol.hasInstance](instance) {
        if (instance.convert && instance.convertPriority) {
            return true;
        } else {
            return false;
        }
    }
}

module.exports = {
    RequestConverter,
};

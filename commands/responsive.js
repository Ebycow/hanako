const { UserAction, ActionResult } = require('../models/useraction');
const { ActionContext } = require('../contexts/actioncontext');

/**
 * メッセージ以外の入力に対し反応するクラスの共通インターフェイス
 *
 * @interface
 */
class Responsive {
    /**
     * メッセージ以外の入力 {UserAction} を受けて {ActionResult} を返す。
     *
     * @param {ActionContext} context アクションコンテキスト
     * @param {UserAction} action アクション
     * @returns {Promise<ActionResult>|ActionResult}
     * @abstract
     */
    respond(context, action) {
        throw new Error('not implemented');
    }

    /**
     * @param {UserAction} action 対象アクション
     * @returns {boolean} 対象アクションをさばけるのかどうか
     * @abstract
     */
    canRespond(action) {
        throw new Error('not implemented');
    }

    /**
     * @param {object} klass 実装先クラス
     */
    static applyToClass(klass) {
        for (const prop of ['respond', 'canRespond']) {
            Object.defineProperty(klass.prototype, prop, Object.getOwnPropertyDescriptor(Responsive.prototype, prop));
        }
    }

    static [Symbol.hasInstance](instance) {
        if (instance.respond && instance.canRespond) {
            return true;
        } else {
            return false;
        }
    }
}

module.exports = {
    Responsive,
};

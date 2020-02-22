/**
 * 非同期で初期化が必要なクラスの共通インターフェイス
 * @interface
 */
class Initable {

    /**
     * 非同期初期化ルーチン
     * @returns {Promise<void>}
     */
    asyncInit() { return Promise.resolve(); }

    static [Symbol.hasInstance](instance) {
        if (instance.asyncInit) {
            return true;
        } else {
            return false;
        }
    }

}

module.exports = {
    Initable
};

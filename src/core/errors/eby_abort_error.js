/**
 * 処理中止のエラー
 * 正常系のなかで、処理を中止するのが適当なときに投げる。異常系では投げない。
 * 正常な中止なので、エラーログには出力されない。
 * なにかを握りつぶして正常系扱いする場合は、これを投げる前に logger.warn か logger.info を出力して追えるようにしておく。
 */
class EbyAbortError extends Error {
    /**
     * えびであることの証明
     *
     * @type {true}
     */
    get eby() {
        return true;
    }

    /**
     * エラータイプ
     *
     * @type {'abort'}
     */
    get type() {
        return 'abort';
    }

    /**
     * @param {string} reason エラーの理由
     * @param  {...any} params Errorコンストラクタにそのまま渡す引数
     */
    constructor(reason, ...params) {
        super(...params);
        if (Error.captureStackTrace) {
            Error.captureStackTrace(this, this.constructor);
        }
        this.reason = reason || 'error';
        this.message = this.message ? this.message : `[${this.constructor.name}] ${this.reason}`;
    }
}

module.exports = EbyAbortError;

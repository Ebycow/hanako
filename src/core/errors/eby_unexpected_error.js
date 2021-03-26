/**
 * 条件未達のエラー
 * 一つ以上の事前条件が存在する関数呼び出し時、呼び出された側で条件の未達が判明し処理を続行できない場合に投げる。
 * このエラーがログに出る ⇔ システム障害 or バグ
 */
class EbyUnexpectedError extends Error {
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
     * @type {'unexpected'}
     */
    get type() {
        return 'unexpected';
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

module.exports = EbyUnexpectedError;

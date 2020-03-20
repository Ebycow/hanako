/**
 * 期待はずれのエラー Disappointment
 * 当然の前提条件が存在する関数呼び出し時、呼び出された側が期待する条件が満たされなかった状況にあって、異常系として後続処理を中止するのが適当な場合に投げる。
 * このエラーを個別にキャッチしてリカバリ処理を書くようなことはしない。
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

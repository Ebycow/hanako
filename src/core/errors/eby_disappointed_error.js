/**
 * 期待はずれのエラー
 * 楽観的処理フローにおいて、期待する整合性が得られなかった場合に投げる。
 * 花子では基本的に悲観的ロックを使用しないため、結果整合性を保つために処理を中断することがある。
 */
class EbyDisappointedError extends Error {
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
     * @type {'disappointed'}
     */
    get type() {
        return 'disappointed';
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

module.exports = EbyDisappointedError;

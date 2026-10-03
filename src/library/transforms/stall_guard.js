const Transform = require('stream').Transform;

/**
 * ストリーム
 * 読み手がデータを待っているのに、上流から一定時間データが届かなければエラーで破棄する
 *
 * 読み手が読んでいない間（再生待ちで先読みしているだけの間など）は時間を数えないため、
 * バックプレッシャーで止まっているだけのストリームを誤って破棄しない。
 */
class StallGuard extends Transform {
    /**
     * StallGuardを構築
     *
     * @param {number} timeoutMs データが届かないまま待つ上限（ミリ秒）
     * @param {object} [options={}] Transformのコンストラクタに渡すオプション
     */
    constructor(timeoutMs, options = {}) {
        super(options);
        this.timeoutMs = timeoutMs;
        this.timer = null;
    }

    /**
     * 読み手がデータを求めたら、上流から届くまでの時間を数え始める
     *
     * @param {number} size
     */
    _read(size) {
        if (this.timer === null) {
            this.timer = setTimeout(() => {
                this.timer = null;
                this.destroy(new Error(`${this.timeoutMs}ms以上データが届かなかった`));
            }, this.timeoutMs);
        }
        super._read(size);
    }

    /**
     * @param {Buffer} chunk
     * @param {string} _ 未使用
     * @param {function(Error?, Buffer):void} done
     */
    _transform(chunk, _, done) {
        this.clearTimer();
        done(null, chunk);
    }

    /**
     * @param {function(Error?):void} done
     */
    _flush(done) {
        this.clearTimer();
        done();
    }

    /**
     * @param {Error?} err
     * @param {function(Error?):void} done
     */
    _destroy(err, done) {
        this.clearTimer();
        done(err);
    }

    /**
     * @private
     */
    clearTimer() {
        if (this.timer !== null) {
            clearTimeout(this.timer);
            this.timer = null;
        }
    }
}

module.exports = StallGuard;

const path = require('path');
const logger = require('log4js').getLogger(path.basename(__filename));
const Transform = require('stream').Transform;

const FRAME_SIZE = 4; // 16-bit stereo: 2bytes(L) + 2bytes(R)
const DEFAULT_THRESHOLD = 256; // ±256 / ±32768 ≒ -42dB

/**
 * PCMストリーム
 * 末尾の無音フレームをトリミング
 *
 * ストリーミング中は末尾かどうか判断できないため、
 * 閾値以下のフレームを内部バッファに退避し、
 * 後続に非無音データが来たら退避分をフラッシュする。
 * ストリーム終了時（_flush）に退避バッファを破棄することで末尾無音を除去する。
 *
 * 前提: 16-bit signed LE / stereo (1フレーム = 4バイト)
 */
class TrailingSilenceTrimmer extends Transform {
    /**
     * @param {number} [threshold=256] 無音判定の振幅閾値（絶対値）
     * @param {object} [options={}] Transformのコンストラクタに渡すオプション
     */
    constructor(threshold = DEFAULT_THRESHOLD, options = {}) {
        super(Object.assign({}, options, { objectMode: false }));
        this._threshold = threshold;
        this._silenceBuf = Buffer.alloc(0);
    }

    /**
     * @param {Buffer} chunk PCMデータのチャンク
     * @param {string} _ 未使用
     * @param {function():void} done コールバック
     */
    _transform(chunk, _, done) {
        // 前回退避した無音バッファと今回のチャンクを結合
        let buffer;
        if (this._silenceBuf.length > 0) {
            buffer = Buffer.concat([this._silenceBuf, chunk]);
            this._silenceBuf = Buffer.alloc(0);
        } else {
            buffer = chunk;
        }

        // フレーム境界に合わない端数は次回に回す
        const remainder = buffer.length % FRAME_SIZE;
        let aligned;
        let leftover;
        if (remainder > 0) {
            aligned = buffer.subarray(0, buffer.length - remainder);
            leftover = Buffer.from(buffer.subarray(buffer.length - remainder));
        } else {
            aligned = buffer;
            leftover = null;
        }

        // 末尾方向から無音フレームの開始位置を探す
        let lastNonSilent = aligned.length;
        while (lastNonSilent >= FRAME_SIZE) {
            const pos = lastNonSilent - FRAME_SIZE;
            const left = Math.abs(aligned.readInt16LE(pos));
            const right = Math.abs(aligned.readInt16LE(pos + 2));
            if (left > this._threshold || right > this._threshold) {
                break;
            }
            lastNonSilent -= FRAME_SIZE;
        }

        // 非無音部分を出力
        if (lastNonSilent > 0) {
            this.push(aligned.subarray(0, lastNonSilent));
        }

        // 末尾の無音部分 + 端数を退避
        const silencePart = lastNonSilent < aligned.length ? aligned.subarray(lastNonSilent) : null;
        if (silencePart && leftover) {
            this._silenceBuf = Buffer.concat([silencePart, leftover]);
        } else if (silencePart) {
            this._silenceBuf = Buffer.from(silencePart);
        } else if (leftover) {
            this._silenceBuf = Buffer.from(leftover);
        }

        done();
    }

    /**
     * ストリーム終了時に呼ばれる
     * 退避バッファ（末尾無音）を破棄して終了
     *
     * @param {function():void} done コールバック
     */
    _flush(done) {
        const trimmedMs = ((this._silenceBuf.length / FRAME_SIZE / 48000) * 1000) | 0;
        if (trimmedMs > 0) {
            logger.trace(`trailing silence trimmed: ${trimmedMs}ms`);
        }
        this._silenceBuf = Buffer.alloc(0);
        done();
    }
}

module.exports = TrailingSilenceTrimmer;

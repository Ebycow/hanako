const path = require('path');
const logger = require('log4js').getLogger(path.basename(__filename));
const Transform = require('stream').Transform;

/**
 * PCMストリーム
 * ステレオフレーム（４バイト）ごとの送信調整
 */
class StereoByteAdjuster extends Transform {
    /**
     * StereoByteAdjusterを構築
     * 常にFlowModeで構築される
     *
     * @param {object} [options={}] Transformのコンストラクタに渡すオプション
     */
    constructor(options = {}) {
        super(Object.assign({}, options, { objectMode: false }));
        this.fragments = [];
    }

    /**
     * PCMストリームのバイト数調整
     *
     * @param {Buffer} _buffer PCMデータのチャンク
     * @param {string} _ 未使用
     * @param {function(Buffer):void} done コールバック
     */
    _transform(_buffer, _, done) {
        let buffer = _buffer;
        if (this.fragments.length > 0) {
            const uint8array = new Uint8Array(this.fragments);
            this.fragments = [];
            const newbuffer = Buffer.concat([uint8array, buffer], uint8array.length + buffer.length);
            buffer = newbuffer;
        }

        const numFragments = buffer.byteLength & 3;

        if (numFragments > 0) {
            const baseOffset = buffer.byteLength - numFragments;
            for (let i = 0; i < numFragments; i++) {
                const uint8value = buffer.readUInt8(baseOffset + i);
                this.fragments.push(uint8value);
            }
            buffer = buffer.subarray(0, -numFragments);
        }

        logger.trace(`adjust: passing ${buffer.byteLength} bytes ...`);
        this.push(buffer);
        done();
    }
}

module.exports = StereoByteAdjuster;

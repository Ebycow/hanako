const path = require('path');
const logger = require('log4js').getLogger(path.basename(__filename));
const Transform = require('stream').Transform;

// Dataチャンク指定バイト
const theDATA = new Uint8Array([0x64, 0x61, 0x74, 0x61]);

/**
 * Waveファイルストリーム
 * Dataチャンクまでのヘッダ情報バイトをスキップ
 */
class WaveFileHeaderTrimmer extends Transform {
    /**
     * WaveFileHeaderTrimmerを構築
     * 常にFlowModeで構築される
     *
     * @param {object} [options={}]
     */
    constructor(options = {}) {
        super(Object.assign({}, options, { objectMode: false }));
        this.alreadyTrimmed = false;
    }

    /**
     * Waveファイルストリームのヘッダ情報をスキップ
     *
     * @param {Buffer} _buffer Waveファイルデータのチャンク
     * @param {string} _ 未使用
     * @param {function(Buffer):void} done コールバック
     */
    _transform(buffer, _, done) {
        if (this.alreadyTrimmed) {
            done(null, buffer);
            return;
        }

        const index = buffer.indexOf(theDATA);

        if (index > -1) {
            const offset = index + 8;
            const skipped = buffer.subarray(offset);
            this.alreadyTrimmed = true;
            logger.trace(`trimmer: skipped ${offset} bytes`);
            done(null, skipped);
        } else {
            done(null, buffer);
        }
    }
}

module.exports = WaveFileHeaderTrimmer;

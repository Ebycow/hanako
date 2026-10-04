const Transform = require('stream').Transform;
const LibSampleRate = require('@alexanderolsen/libsamplerate-js');

/**
 * 使い回すために取っておく変換器の上限
 *
 * @type {number}
 */
const MAX_IDLE = 8;

/**
 * 使い終わった変換器（変換の設定ごと）
 * 変換器はそれぞれ専用のヒープ（26MB）を持ち、作るたびに初期化に数ミリ秒かかるため、作り直さずに使い回す。
 *
 * @type {Map<string, Array<object>>}
 */
const idle = new Map();

/**
 * 取っておいている変換器の数
 *
 * @type {number}
 */
let idleCount = 0;

function poolKey(channels, fromRate, toRate, type) {
    return `${channels}:${fromRate}:${toRate}:${type}`;
}

/**
 * 変換器を取り出す。取っておいたものがなければ作る
 *
 * @param {number} channels
 * @param {number} fromRate
 * @param {number} toRate
 * @param {number} type
 * @returns {Promise<object>}
 */
async function acquire(channels, fromRate, toRate, type) {
    const list = idle.get(poolKey(channels, fromRate, toRate, type));
    if (list && list.length > 0) {
        idleCount--;
        return list.pop();
    }
    return LibSampleRate.create(channels, fromRate, toRate, { converterType: type });
}

/**
 * 使い終わった変換器を返す
 *
 * @param {object} src
 */
function release(src) {
    if (idleCount >= MAX_IDLE) {
        src.destroy();
        return;
    }
    // 同じ値を設定し直すと、前のストリームの状態を捨てて初期化し直す
    src.inputSampleRate = src.inputSampleRate;
    const key = poolKey(src.nChannels, src.inputSampleRate, src.outputSampleRate, src.converterType);
    if (!idle.has(key)) idle.set(key, []);
    idle.get(key).push(src);
    idleCount++;
}

/**
 * PCMストリーム
 * サンプリングレート変換（libsamplerateのWebAssembly版）
 *
 * 入力は符号付き16bitまたは32bitのリトルエンディアン、出力は符号付き16bitのリトルエンディアン。
 * ネイティブアドオンを使わないため、OSやCPUを問わず動作する。
 * 変換器は破棄されたら次のストリームのために取っておく。
 */
class SampleRateConverter extends Transform {
    /**
     * SampleRateConverterを構築
     *
     * @param {object} opts
     * @param {number} [opts.type=SampleRateConverter.SRC_SINC_MEDIUM_QUALITY] 変換アルゴリズム
     * @param {number} opts.channels チャンネル数
     * @param {number} opts.fromRate 入力のサンプリングレート
     * @param {number} opts.fromDepth 入力のビット深度（16 または 32）
     * @param {number} opts.toRate 出力のサンプリングレート
     */
    constructor(opts) {
        if (!(opts.fromDepth === 16 || opts.fromDepth === 32)) {
            throw new Error(`Invalid source bit depth: ${opts.fromDepth}`);
        }
        super({ objectMode: false });
        this.channels = opts.channels;
        this.bytesPerSample = opts.fromDepth / 8;
        this.fragment = Buffer.alloc(0);
        this.src = null;
        this.broken = false;

        const type = opts.type === undefined ? SampleRateConverter.SRC_SINC_MEDIUM_QUALITY : opts.type;
        this.ready = acquire(opts.channels, opts.fromRate, opts.toRate, type).then((src) => {
            if (this.destroyed) {
                release(src);
            } else {
                this.src = src;
            }
        });
        // 失敗は最初の _transform で受け取る。それまでに unhandledRejection にならないようにする
        this.ready.catch(() => {});
    }

    /**
     * @param {Buffer} chunk PCMデータのチャンク
     * @param {string} _ 未使用
     * @param {function(Error?):void} done コールバック
     */
    _transform(chunk, _, done) {
        if (this.src) {
            this.convert(chunk, done);
            return;
        }
        this.ready.then(() => {
            if (this.destroyed) return done();
            this.convert(chunk, done);
        }, done);
    }

    /**
     * @param {Error?} err
     * @param {function(Error?):void} done
     */
    _destroy(err, done) {
        if (this.src) {
            // 変換に失敗した変換器は中の状態が分からないため使い回さない
            if (this.broken) {
                this.src.destroy();
            } else {
                release(this.src);
            }
            this.src = null;
        }
        done(err);
    }

    /**
     * @private
     * @param {Buffer} chunk
     * @param {function(Error?):void} done
     */
    convert(chunk, done) {
        let buffer = this.fragment.length > 0 ? Buffer.concat([this.fragment, chunk]) : chunk;

        // フレームの途中で切れた分は次のチャンクに回す
        const frameSize = this.channels * this.bytesPerSample;
        const remainder = buffer.length % frameSize;
        this.fragment = Buffer.from(buffer.subarray(buffer.length - remainder));
        buffer = buffer.subarray(0, buffer.length - remainder);
        if (buffer.length === 0) return done();

        const numSamples = buffer.length / this.bytesPerSample;
        const input = new Float32Array(numSamples);
        if (this.bytesPerSample === 2) {
            for (let i = 0; i < numSamples; i++) input[i] = buffer.readInt16LE(i * 2) / 0x8000;
        } else {
            for (let i = 0; i < numSamples; i++) input[i] = buffer.readInt32LE(i * 4) / 0x80000000;
        }

        let output;
        try {
            output = this.src.full(input);
        } catch (err) {
            this.broken = true;
            // WASM版は文字列を投げることがある
            return done(err instanceof Error ? err : new Error(String(err)));
        }

        const result = Buffer.allocUnsafe(output.length * 2);
        for (let i = 0; i < output.length; i++) {
            const value = Math.round(output[i] * 0x8000);
            result.writeInt16LE(value > 0x7fff ? 0x7fff : value < -0x8000 ? -0x8000 : value, i * 2);
        }
        done(null, result);
    }
}

SampleRateConverter.SRC_SINC_BEST_QUALITY = LibSampleRate.ConverterType.SRC_SINC_BEST_QUALITY;
SampleRateConverter.SRC_SINC_MEDIUM_QUALITY = LibSampleRate.ConverterType.SRC_SINC_MEDIUM_QUALITY;
SampleRateConverter.SRC_SINC_FASTEST = LibSampleRate.ConverterType.SRC_SINC_FASTEST;
SampleRateConverter.SRC_ZERO_ORDER_HOLD = LibSampleRate.ConverterType.SRC_ZERO_ORDER_HOLD;
SampleRateConverter.SRC_LINEAR = LibSampleRate.ConverterType.SRC_LINEAR;

module.exports = SampleRateConverter;

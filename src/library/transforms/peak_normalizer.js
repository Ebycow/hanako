const path = require('path');
const logger = require('log4js').getLogger(path.basename(__filename));
const { Readable } = require('stream');

/**
 * PCMストリームのピーク振幅を正規化
 *
 * 音量が小さいSEファイルを一定レベルまで持ち上げる。
 * ストリーム全体をバッファし、ピーク振幅を検出してゲインを適用。
 *
 * @param {Readable} stream 入力PCMストリーム (16-bit signed LE, stereo, 48kHz)
 * @param {number} targetPeak ターゲットピークレベル (0-32767の範囲)
 * @returns {Promise<Readable>} 正規化されたPCMストリーム
 */
async function normalizePeak(stream, targetPeak) {
    // targetPeakが0以下の場合は正規化を無効化
    if (targetPeak <= 0) {
        return stream;
    }

    // ストリーム全体をバッファに読み込み
    const chunks = [];
    for await (const chunk of stream) {
        chunks.push(chunk);
    }
    const buffer = Buffer.concat(chunks);

    // データが空の場合はそのまま返却
    if (buffer.length === 0) {
        return Readable.from(buffer);
    }

    // ピーク振幅を検出（16-bit stereo PCMを想定、2バイトごとにサンプル）
    let peak = 0;
    for (let i = 0; i < buffer.length; i += 2) {
        if (i + 1 >= buffer.length) break; // 不完全なフレームをスキップ
        const sample = Math.abs(buffer.readInt16LE(i));
        if (sample > peak) {
            peak = sample;
        }
    }

    // ピークが0（完全無音）または既にターゲット以上の場合は正規化不要
    if (peak === 0 || peak >= targetPeak) {
        logger.trace(`SE正規化スキップ: peak=${peak}, target=${targetPeak}`);
        return Readable.from(buffer);
    }

    // ゲイン係数を計算
    const gain = targetPeak / peak;
    logger.debug(`SE音量正規化: peak=${peak} → ${targetPeak} (gain=${gain.toFixed(2)}x)`);

    // ゲインを適用した新しいバッファを作成
    const output = Buffer.alloc(buffer.length);
    for (let i = 0; i < buffer.length; i += 2) {
        if (i + 1 >= buffer.length) {
            // 不完全なフレームはそのままコピー
            output[i] = buffer[i];
            break;
        }

        // サンプルを読み取り、ゲインを適用
        let sample = buffer.readInt16LE(i);
        sample = Math.round(sample * gain);

        // クリッピング防止（16-bit signed intの範囲に収める）
        sample = Math.max(-32768, Math.min(32767, sample));

        // 出力バッファに書き込み
        output.writeInt16LE(sample, i);
    }

    // 新しいストリームとして返却
    return Readable.from(output);
}

module.exports = normalizePeak;

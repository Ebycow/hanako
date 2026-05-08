const should = require('chai').should();
const { Readable } = require('stream');
const normalizePeak = require('../../src/library/transforms/peak_normalizer');

/************************************************************************
 * normalizePeak関数単体スペック
 *
 * 機能：SE音源のピーク振幅を正規化
 * 期待動作：小さい音量のSEを指定レベルまで持ち上げる
 ***********************************************************************/

describe('normalizePeak', () => {
    /**
     * テスト用のPCMストリームを作成（16-bit signed LE, stereo）
     * @param {number[]} samples サンプル値の配列（-32768〜32767）
     * @returns {Readable}
     */
    function createPcmStream(samples) {
        const buffer = Buffer.alloc(samples.length * 2);
        samples.forEach((sample, i) => {
            buffer.writeInt16LE(sample, i * 2);
        });
        return Readable.from(buffer);
    }

    /**
     * ストリームをバッファに読み込み、サンプル配列として返す
     * @param {Readable} stream
     * @returns {Promise<number[]>}
     */
    async function streamToSamples(stream) {
        const chunks = [];
        for await (const chunk of stream) {
            chunks.push(chunk);
        }
        const buffer = Buffer.concat(chunks);
        const samples = [];
        for (let i = 0; i < buffer.length; i += 2) {
            samples.push(buffer.readInt16LE(i));
        }
        return samples;
    }

    describe('正常系', () => {
        specify('小さい音量のSEをターゲットレベルまで持ち上げる', async () => {
            // ピークが1000の小さい音源
            const input = [0, 500, -1000, 800, 0];
            const targetPeak = 10000;
            const stream = createPcmStream(input);

            const result = await normalizePeak(stream, targetPeak);
            const output = await streamToSamples(result);

            // ゲイン = 10000 / 1000 = 10倍
            output.should.deep.equal([0, 5000, -10000, 8000, 0]);
        });

        specify('既に大きい音量のSEは変更しない', async () => {
            // ピークが20000の大きい音源
            const input = [0, 10000, -20000, 15000, 0];
            const targetPeak = 10000;
            const stream = createPcmStream(input);

            const result = await normalizePeak(stream, targetPeak);
            const output = await streamToSamples(result);

            // ピーク >= ターゲットなので変更なし
            output.should.deep.equal(input);
        });

        specify('完全無音のSEはそのまま返す', async () => {
            const input = [0, 0, 0, 0, 0];
            const targetPeak = 10000;
            const stream = createPcmStream(input);

            const result = await normalizePeak(stream, targetPeak);
            const output = await streamToSamples(result);

            // ピーク=0なので変更なし
            output.should.deep.equal(input);
        });

        specify('ターゲットピークが0の場合は正規化を無効化', async () => {
            const input = [0, 500, -1000, 800, 0];
            const targetPeak = 0;
            const stream = createPcmStream(input);

            const result = await normalizePeak(stream, targetPeak);
            const output = await streamToSamples(result);

            // targetPeak=0なので変更なし
            output.should.deep.equal(input);
        });

        specify('空のストリームを正しく処理', async () => {
            const stream = Readable.from(Buffer.alloc(0));
            const targetPeak = 10000;

            const result = await normalizePeak(stream, targetPeak);
            const output = await streamToSamples(result);

            output.should.deep.equal([]);
        });

        specify('クリッピング防止：ゲイン適用後に32767を超える場合', async () => {
            // ピーク10000、ターゲット32000なのでゲイン3.2倍
            const input = [0, 5000, -10000, 8000, 0];
            const targetPeak = 32000;
            const stream = createPcmStream(input);

            const result = await normalizePeak(stream, targetPeak);
            const output = await streamToSamples(result);

            // 5000*3.2=16000, -10000*3.2=-32000, 8000*3.2=25600
            output.should.deep.equal([0, 16000, -32000, 25600, 0]);
        });

        specify('クリッピング防止：最大値でクランプ', async () => {
            // ピーク1000、ターゲット32767なのでゲイン32.767倍
            const input = [0, 500, -1000, 800];
            const targetPeak = 32767;
            const stream = createPcmStream(input);

            const result = await normalizePeak(stream, targetPeak);
            const output = await streamToSamples(result);

            // 500*32.767=16383.5≈16384, -1000*32.767=-32767, 800*32.767=26213.6≈26214
            output[0].should.equal(0);
            output[1].should.be.approximately(16384, 1);
            output[2].should.equal(-32767);
            output[3].should.be.approximately(26214, 1);
        });

        specify('ステレオPCM（L/Rチャンネル）を正しく処理', async () => {
            // Lチャンネル: 1000, Rチャンネル: -500 のステレオフレーム
            // ピークは1000、ターゲット10000なのでゲイン10倍
            const input = [1000, -500, 800, -400, 0, 0];
            const targetPeak = 10000;
            const stream = createPcmStream(input);

            const result = await normalizePeak(stream, targetPeak);
            const output = await streamToSamples(result);

            // すべて10倍
            output.should.deep.equal([10000, -5000, 8000, -4000, 0, 0]);
        });

        specify('負の値のピークも正しく検出', async () => {
            // 最大の負の値がピーク
            const input = [0, 100, 500, -1500, 200];
            const targetPeak = 15000;
            const stream = createPcmStream(input);

            const result = await normalizePeak(stream, targetPeak);
            const output = await streamToSamples(result);

            // ピーク=1500（絶対値）、ゲイン=10倍
            output.should.deep.equal([0, 1000, 5000, -15000, 2000]);
        });
    });

    describe('異常系・エッジケース', () => {
        specify('不完全なフレーム（奇数バイト）を適切に処理', async () => {
            // 通常は2バイト単位だが、最後の1バイトが欠損しているケース
            const buffer = Buffer.alloc(5); // 奇数バイト
            buffer.writeInt16LE(1000, 0);
            buffer.writeInt16LE(-500, 2);
            buffer[4] = 0xff; // 不完全なフレーム

            const stream = Readable.from(buffer);
            const targetPeak = 10000;

            // エラーを起こさず処理できる
            const result = await normalizePeak(stream, targetPeak);
            should.exist(result);

            const output = [];
            for await (const chunk of result) {
                output.push(chunk);
            }
            Buffer.concat(output).length.should.equal(5);
        });

        specify('負のターゲットピークは正規化を無効化', async () => {
            const input = [0, 500, -1000, 800, 0];
            const targetPeak = -100;
            const stream = createPcmStream(input);

            const result = await normalizePeak(stream, targetPeak);
            const output = await streamToSamples(result);

            // targetPeak <= 0なので変更なし
            output.should.deep.equal(input);
        });
    });
});

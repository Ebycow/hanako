const { expect } = require('chai');
const { Readable } = require('stream');
const SampleRateConverter = require('../../src/library/transforms/sample_rate_converter');

/************************************************************************
 * SampleRateConverterクラス単体スペック
 *
 * 機能：PCMストリームのサンプリングレート変換
 * 期待動作：16bit/32bitのPCMを、16bitの指定レートへ変換する
 * 備考：ネイティブアドオンを使わないため、OSを問わず動作する
 ***********************************************************************/

describe('SampleRateConverter', () => {
    /**
     * ステレオの正弦波（16bit signed LE）
     *
     * @param {number} rate サンプリングレート
     * @param {number} frames フレーム数
     * @returns {Buffer}
     */
    function sine16(rate, frames) {
        const buffer = Buffer.alloc(frames * 4);
        for (let i = 0; i < frames; i++) {
            const value = Math.round(Math.sin((2 * Math.PI * 440 * i) / rate) * 16000);
            buffer.writeInt16LE(value, i * 4);
            buffer.writeInt16LE(value, i * 4 + 2);
        }
        return buffer;
    }

    /**
     * バッファを指定サイズのチャンクに分けて流す
     *
     * @param {Buffer} buffer
     * @param {number} size
     * @returns {Readable}
     */
    function chunked(buffer, size) {
        const chunks = [];
        for (let i = 0; i < buffer.length; i += size) chunks.push(buffer.subarray(i, i + size));
        return Readable.from(chunks);
    }

    async function consume(stream) {
        const chunks = [];
        for await (const chunk of stream) chunks.push(chunk);
        return Buffer.concat(chunks);
    }

    function opts(overrides) {
        return Object.assign({ channels: 2, fromRate: 22050, fromDepth: 16, toRate: 48000 }, overrides);
    }

    specify('22050Hzの音声を48000Hzのフレーム数に変換する', async () => {
        const input = sine16(22050, 22050);

        const output = await consume(chunked(input, 4096).pipe(new SampleRateConverter(opts())));

        // フィルタの遅延分だけ短くなる
        const frames = output.length / 4;
        expect(output.length % 4).to.equal(0);
        expect(frames).to.be.within(48000 - 500, 48000);
    });

    specify('変換後も同じ音量の波形を保つ', async () => {
        const input = sine16(22050, 22050);

        const output = await consume(chunked(input, 4096).pipe(new SampleRateConverter(opts())));

        let peak = 0;
        for (let i = 0; i < output.length; i += 2) peak = Math.max(peak, Math.abs(output.readInt16LE(i)));
        expect(peak).to.be.within(15500, 16500);
    });

    specify('フレームの途中で切れたチャンクも欠けずに変換する', async () => {
        const input = sine16(22050, 22050);

        const aligned = await consume(chunked(input, 4096).pipe(new SampleRateConverter(opts())));
        const ragged = await consume(chunked(input, 4095).pipe(new SampleRateConverter(opts())));

        expect(ragged.length).to.equal(aligned.length);
    });

    specify('同じレートならそのまま出力する', async () => {
        const input = sine16(48000, 4800);

        const output = await consume(chunked(input, 4096).pipe(new SampleRateConverter(opts({ fromRate: 48000 }))));

        expect(output.equals(input)).to.be.true;
    });

    specify('32bitの入力を16bitで出力する', async () => {
        const input = Buffer.alloc(8);
        input.writeInt32LE(0x40000000, 0);
        input.writeInt32LE(-0x40000000, 4);

        const output = await consume(
            Readable.from([input]).pipe(new SampleRateConverter(opts({ fromRate: 48000, fromDepth: 32 })))
        );

        expect(output.readInt16LE(0)).to.equal(0x4000);
        expect(output.readInt16LE(2)).to.equal(-0x4000);
    });

    specify('同時に変換しても互いの状態が混ざらない', async () => {
        const input = sine16(22050, 22050);

        const alone = await consume(chunked(input, 4096).pipe(new SampleRateConverter(opts())));
        const [together] = await Promise.all([
            consume(chunked(input, 4096).pipe(new SampleRateConverter(opts()))),
            consume(chunked(sine16(44100, 44100), 4096).pipe(new SampleRateConverter(opts({ fromRate: 44100 })))),
        ]);

        expect(together.equals(alone)).to.be.true;
    });

    specify('16bit・32bit以外のビット深度は受け付けない', () => {
        expect(() => new SampleRateConverter(opts({ fromDepth: 24 }))).to.throw('bit depth');
    });

    specify('準備が終わる前に破棄してもエラーにならない', async () => {
        const converter = new SampleRateConverter(opts());
        converter.destroy();
        await converter.ready;

        expect(converter.src).to.be.null;
    });
});

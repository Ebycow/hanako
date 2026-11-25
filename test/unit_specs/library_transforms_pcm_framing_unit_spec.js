require('chai').should();
const Mono2StereoConverter = require('../../src/library/transforms/mono_2_stereo_converter');
const StereoByteAdjuster = require('../../src/library/transforms/stereo_byte_adjuster');
const TrailingSilenceTrimmer = require('../../src/library/transforms/trailing_silence_trimmer');

/************************************************************************
 * PCM のフレーム境界を扱う Transform 群
 *
 * どれも「チャンクがサンプル / フレームの途中で切れていても、
 * 結合した結果は一括で流したときと同じになる」ことが要。
 * そのため、同じ入力を一括とバラバラ（1 バイトずつ等）の両方で流して比べる。
 ***********************************************************************/

/**
 * Transform にチャンクを順に書き込み、出力を結合して返す
 *
 * @param {import('stream').Transform} transform
 * @param {Buffer[]} chunks
 * @returns {Promise<Buffer>}
 */
function run(transform, chunks) {
    return new Promise((resolve, reject) => {
        const out = [];
        transform.on('data', (b) => out.push(b));
        transform.on('end', () => resolve(Buffer.concat(out)));
        transform.on('error', reject);
        chunks.forEach((c) => transform.write(c));
        transform.end();
    });
}

/** 16-bit LE のサンプル列からバッファを作る */
function pcm(...samples) {
    const buf = Buffer.alloc(samples.length * 2);
    samples.forEach((s, i) => buf.writeInt16LE(s, i * 2));
    return buf;
}

/** バッファを指定サイズごとに切る */
function split(buf, size) {
    const chunks = [];
    for (let i = 0; i < buf.length; i += size) chunks.push(buf.subarray(i, i + size));
    return chunks;
}

describe('Mono2StereoConverter', () => {
    specify('各サンプルを左右に複製する', async () => {
        const out = await run(new Mono2StereoConverter(), [pcm(1, -2, 32767, -32768)]);
        out.should.deep.equal(pcm(1, 1, -2, -2, 32767, 32767, -32768, -32768));
    });

    specify('空の入力からは何も出ない', async () => {
        const out = await run(new Mono2StereoConverter(), []);
        out.length.should.equal(0);
    });

    [1, 3, 5].forEach((size) => {
        specify(`${size} バイトずつ届いても、一括で流したときと同じ結果になる`, async () => {
            const input = pcm(100, -200, 300, -400, 500, 1234, -4321);
            const whole = await run(new Mono2StereoConverter(), [input]);
            const pieces = await run(new Mono2StereoConverter(), split(input, size));
            pieces.should.deep.equal(whole);
        });
    });

    specify('末尾に半端な 1 バイトが残っても出力は 4 バイト単位になる', async () => {
        const input = Buffer.concat([pcm(10, 20), Buffer.from([0x7f])]);
        const out = await run(new Mono2StereoConverter(), [input]);
        out.should.deep.equal(pcm(10, 10, 20, 20));
    });
});

describe('StereoByteAdjuster', () => {
    specify('4 バイト単位の入力はそのまま通す', async () => {
        const input = pcm(1, 2, 3, 4);
        (await run(new StereoByteAdjuster(), [input])).should.deep.equal(input);
    });

    [1, 2, 3, 5, 7].forEach((size) => {
        specify(`${size} バイトずつ届いても、出力の各チャンクは 4 バイト単位で、内容は変わらない`, async () => {
            const input = pcm(1, -1, 2, -2, 3, -3, 4, -4, 5, -5);
            const adjuster = new StereoByteAdjuster();
            const sizes = [];
            adjuster.on('data', (b) => sizes.push(b.length));

            const out = await run(adjuster, split(input, size));

            out.should.deep.equal(input);
            sizes.every((n) => n % 4 === 0).should.equal(true, `chunk sizes: ${sizes}`);
        });
    });

    specify('最後に 4 バイトに満たない端数は捨てる', async () => {
        const input = Buffer.concat([pcm(1, 2), Buffer.from([0xaa, 0xbb, 0xcc])]);
        (await run(new StereoByteAdjuster(), [input])).should.deep.equal(pcm(1, 2));
    });
});

describe('TrailingSilenceTrimmer', () => {
    const loud = 1000;

    specify('末尾の無音フレームだけを取り除く', async () => {
        const input = pcm(0, 0, loud, loud, 0, 0, 0, 0);
        const out = await run(new TrailingSilenceTrimmer(), [input]);
        out.should.deep.equal(pcm(0, 0, loud, loud));
    });

    specify('途中の無音は、後ろに音があれば残す', async () => {
        const chunks = [pcm(loud, loud, 0, 0), pcm(0, 0, 0, 0), pcm(loud, -loud)];
        const out = await run(new TrailingSilenceTrimmer(), chunks);
        out.should.deep.equal(Buffer.concat(chunks));
    });

    specify('すべて無音なら何も出さない', async () => {
        const out = await run(new TrailingSilenceTrimmer(), [pcm(0, 0, 5, -5, 256, -256)]);
        out.length.should.equal(0);
    });

    specify('左右どちらかが閾値を超えれば無音ではない', async () => {
        const out = await run(new TrailingSilenceTrimmer(), [pcm(0, 257, 0, 0)]);
        out.should.deep.equal(pcm(0, 257));
    });

    specify('閾値は指定できる', async () => {
        const input = pcm(500, 500, 0, 0);
        (await run(new TrailingSilenceTrimmer(1000), [input])).length.should.equal(0);
        (await run(new TrailingSilenceTrimmer(100), [input])).should.deep.equal(pcm(500, 500));
    });

    [1, 3, 6].forEach((size) => {
        specify(`${size} バイトずつ届いても、一括で流したときと同じ結果になる`, async () => {
            const input = pcm(0, 0, loud, 0, 0, 0, 0, -loud, 3, 2, 0, 0, 1, 1);
            const whole = await run(new TrailingSilenceTrimmer(), [input]);
            const pieces = await run(new TrailingSilenceTrimmer(), split(input, size));
            pieces.should.deep.equal(whole);
            whole.should.deep.equal(pcm(0, 0, loud, 0, 0, 0, 0, -loud));
        });
    });

    specify('フレームに満たない端数で終わったら、端数も捨てる', async () => {
        const input = Buffer.concat([pcm(loud, loud), Buffer.from([0x01, 0x02])]);
        (await run(new TrailingSilenceTrimmer(), [input])).should.deep.equal(pcm(loud, loud));
    });
});

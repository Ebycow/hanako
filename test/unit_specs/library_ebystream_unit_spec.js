const should = require('chai').should();
const { Readable } = require('stream');
const EbyStream = require('../../src/library/ebystream');

/************************************************************************
 * EbyStreamクラス単体スペック
 *
 * 期待動作：複数のReadableストリームを順次連結してひとつのストリームとして読み取れる
 * 備考：SE再生時のオーディオストリーム連結に使用される
 ***********************************************************************/

function createDataStream(data) {
    const buf = Buffer.from(data);
    let pushed = false;
    return new Readable({
        read() {
            if (!pushed) {
                this.push(buf);
                pushed = true;
            } else {
                this.push(null);
            }
        },
    });
}

function consumeStream(stream) {
    return new Promise((resolve, reject) => {
        const chunks = [];
        stream.on('data', (chunk) => chunks.push(chunk));
        stream.on('end', () => resolve(Buffer.concat(chunks)));
        stream.on('error', reject);
    });
}

describe('EbyStream', () => {
    describe('ストリーム連結', () => {
        specify('単一ストリームのデータを正しく読み取れる', async () => {
            const stream = new EbyStream([createDataStream('hello')]);
            const result = await consumeStream(stream);
            result.toString().should.equal('hello');
        });

        specify('複数ストリームを順次連結して読み取れる', async () => {
            const s1 = createDataStream('aaa');
            const s2 = createDataStream('bbb');
            const s3 = createDataStream('ccc');
            const stream = new EbyStream([s1, s2, s3]);
            const result = await consumeStream(stream);
            result.toString().should.equal('aaabbbccc');
        });

        specify('空配列でもEOFまで正常に動作する', async () => {
            const stream = new EbyStream([]);
            const result = await consumeStream(stream);
            result.should.have.lengthOf(0);
        });

        specify('大きなチャンクを含むストリームも正しく連結される', async () => {
            const bigData = 'x'.repeat(65536);
            const s1 = createDataStream(bigData);
            const s2 = createDataStream('tail');
            const stream = new EbyStream([s1, s2]);
            const result = await consumeStream(stream);
            result.toString().should.equal(bigData + 'tail');
        });
    });

    describe('エラー伝搬', () => {
        specify('子ストリームのerrorがEbyStreamに伝搬する', (done) => {
            const errStream = new Readable({
                read() {
                    process.nextTick(() => this.destroy(new Error('test-error')));
                },
            });
            const stream = new EbyStream([errStream]);
            stream.on('error', (err) => {
                err.message.should.equal('test-error');
                done();
            });
            stream.resume(); // データ消費を開始
        });

        specify('destroyでcurrentストリームもdestroyされる', () => {
            let childDestroyed = false;
            const child = new Readable({
                read() {
                    /* never push */
                },
                destroy(_err, cb) {
                    childDestroyed = true;
                    cb();
                },
            });
            const stream = new EbyStream([child]);
            stream.destroy();
            childDestroyed.should.be.true;
        });
    });
});

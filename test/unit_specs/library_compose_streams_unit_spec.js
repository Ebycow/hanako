const should = require('chai').should();
const { Readable, Transform, compose } = require('stream');
const composeStreams = require('../../src/library/compose_streams');

/************************************************************************
 * composeStreams単体スペック
 *
 * 期待動作：受け取り終えたが読み切っていないストリームを破棄しても、uncaughtExceptionにならない
 * 備考：音声ストリームはアダプタとStreamFetcherでcomposeが二重になる
 ***********************************************************************/

// 受け取り終えた（end済み）音声の応答
function fullResponse() {
    return Readable.from([Buffer.alloc(192000, 0x40), Buffer.alloc(192000, 0x40), Buffer.alloc(192000, 0x40)]);
}

function passThroughTransform() {
    return new Transform({
        transform(chunk, encoding, callback) {
            callback(null, chunk);
        },
    });
}

/**
 * アダプタとStreamFetcherと同じく二重につなぎ、少しだけ読んでから破棄する
 *
 * @returns {Promise<Array<Error>>} 受け手のいなかったエラー
 */
async function destroyWhilePlaying(composeFn) {
    const uncaught = [];
    const onUncaught = (err) => uncaught.push(err);
    // mochaの受け手を一時的に外し、受け手のいなかったエラーを集める
    const mochaListeners = process.listeners('uncaughtException');
    process.removeAllListeners('uncaughtException');
    process.on('uncaughtException', onUncaught);
    try {
        const inner = composeFn(fullResponse(), passThroughTransform());
        inner.on('error', () => {});
        const outer = composeFn(inner, passThroughTransform());
        outer.on('error', () => {});
        await new Promise((resolve) => outer.once('readable', resolve));
        outer.read(3840);
        await new Promise((resolve) => setTimeout(resolve, 50));
        outer.destroy();
        await new Promise((resolve) => setTimeout(resolve, 50));
    } finally {
        process.removeListener('uncaughtException', onUncaught);
        mochaListeners.forEach((l) => process.on('uncaughtException', l));
    }
    return uncaught;
}

describe('composeStreams', () => {
    specify('（前提）stream.composeのままでは、受け取り終えて再生中に破棄すると受け手のないエラーが出る', async () => {
        const uncaught = await destroyWhilePlaying(compose);
        uncaught.length.should.be.above(0);
        uncaught[0].name.should.equal('AbortError');
    });

    specify('受け取り終えて再生中に破棄しても、受け手のないエラーが出ない', async () => {
        const uncaught = await destroyWhilePlaying(composeStreams);
        uncaught.should.have.lengthOf(0);
    });

    specify('つないでいる間のエラーは、返したストリームに伝わる', async () => {
        const failing = new Transform({
            transform(chunk, encoding, callback) {
                callback(new Error('broken'));
            },
        });
        const stream = composeStreams(fullResponse(), failing);
        const err = await new Promise((resolve) => {
            stream.on('error', resolve);
            stream.resume();
        });
        should.exist(err);
        err.message.should.equal('broken');
    });
});

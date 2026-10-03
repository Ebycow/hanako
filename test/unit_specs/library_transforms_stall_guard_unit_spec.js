const should = require('chai').should();
const sinon = require('sinon');
const { PassThrough } = require('stream');
const StallGuard = require('../../src/library/transforms/stall_guard');

/************************************************************************
 * StallGuardクラス単体スペック
 *
 * 期待動作：読み手が待っているのに上流からデータが届かなければエラーで破棄する
 * 備考：読み手が読んでいない間は時間を数えない
 ***********************************************************************/

describe('StallGuard', () => {
    let clock;

    beforeEach(() => {
        clock = sinon.useFakeTimers();
    });

    afterEach(() => {
        clock.restore();
    });

    specify('読み手が待っているのにデータが届かなければ、エラーで破棄する', async () => {
        const guard = new StallGuard(1000);
        const errors = [];
        guard.on('error', (err) => errors.push(err));
        guard.resume();

        await clock.tickAsync(999);
        guard.destroyed.should.be.false;
        await clock.tickAsync(1);

        guard.destroyed.should.be.true;
        errors[0].message.should.include('1000ms');
    });

    specify('データが届くたびに数え直す', async () => {
        const upstream = new PassThrough();
        const guard = new StallGuard(1000);
        upstream.pipe(guard).resume();

        await clock.tickAsync(800);
        upstream.write(Buffer.alloc(4));
        await clock.tickAsync(800);
        upstream.write(Buffer.alloc(4));
        await clock.tickAsync(800);

        guard.destroyed.should.be.false;
        guard.destroy();
    });

    specify('読み手が読んでいない間は時間を数えない', async () => {
        const upstream = new PassThrough();
        const guard = new StallGuard(1000, { highWaterMark: 4 });
        upstream.pipe(guard);
        // 読み手がいないまま、バッファがいっぱいになるまでデータを送る
        upstream.write(Buffer.alloc(16));

        await clock.tickAsync(5000);

        guard.destroyed.should.be.false;
        guard.destroy();
    });

    specify('最後まで届いたらエラーにしない', async () => {
        const upstream = new PassThrough();
        const guard = new StallGuard(1000);
        const chunks = [];
        upstream.pipe(guard).on('data', (chunk) => chunks.push(chunk));
        upstream.end(Buffer.from([1, 2, 3, 4]));

        await clock.tickAsync(5000);

        Buffer.concat(chunks).should.deep.equal(Buffer.from([1, 2, 3, 4]));
        should.not.exist(guard.errored);
    });
});

const should = require('chai').should();
const EbyAbortError = require('../../src/core/errors/eby_abort_error');
const errors = require('../../src/core/errors');

/************************************************************************
 * EbyAbortErrorクラス単体スペック
 *
 * 期待動作：処理中止のエラーとして機能する
 * 備考：なし
 ***********************************************************************/

describe('EbyAbortError', () => {
    context('正常系', () => {
        specify('ebyプロパティはtrueを返す', () => {
            const err = new EbyAbortError();
            err.eby.should.equal(true);
        });

        specify('typeプロパティはabortを返す', () => {
            const err = new EbyAbortError();
            err.type.should.equal('abort');
        });

        specify('Errorを継承している', () => {
            const err = new EbyAbortError();
            err.should.be.an.instanceOf(Error);
        });

        specify('reasonを保持する', () => {
            const err = new EbyAbortError('test-reason');
            err.reason.should.equal('test-reason');
        });

        specify('reasonを省略するとerrorになる', () => {
            const err = new EbyAbortError();
            err.reason.should.equal('error');
        });
    });

    describe('errors.promises.abort', () => {
        specify('EbyAbortErrorでrejectされたPromiseを返す', async () => {
            try {
                await errors.promises.abort('test-reason');
                should.fail('rejectされるべき');
            } catch (e) {
                e.should.be.an.instanceOf(EbyAbortError);
                e.reason.should.equal('test-reason');
            }
        });
    });
});

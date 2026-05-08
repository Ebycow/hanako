const should = require('chai').should();
const ensure = require('../../src/core/utils/ensure');
const EbyAbortError = require('../../src/core/errors/eby_abort_error');

/************************************************************************
 * ensure関数単体スペック
 *
 * 期待動作：判定式が偽のときEbyAbortErrorを投げる
 * 備考：なし
 ***********************************************************************/

describe('ensure', () => {
    context('正常系', () => {
        specify('trueを渡すと例外を投げない', () => {
            (() => ensure(true)).should.not.throw();
        });
    });

    context('異常系', () => {
        specify('falseを渡すとEbyAbortErrorを投げる', () => {
            (() => ensure(false)).should.throw(EbyAbortError);
        });
    });
});

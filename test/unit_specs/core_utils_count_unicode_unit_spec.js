const should = require('chai').should();
const countUnicode = require('../../src/core/utils/count_unicode');

/************************************************************************
 * countUnicode関数単体スペック
 *
 * 期待動作：文字列のUnicodeコードポイント数を返す
 * 備考：なし
 ***********************************************************************/

describe('countUnicode', () => {
    context('正常系', () => {
        specify('空文字列は0を返す', () => {
            countUnicode('').should.equal(0);
        });

        specify('ASCII文字列は文字数を返す', () => {
            countUnicode('hello').should.equal(5);
        });

        specify('日本語文字列はコードポイント数を返す', () => {
            countUnicode('花子').should.equal(2);
        });

        specify('サロゲートペアの絵文字は1コードポイント', () => {
            countUnicode('😀').should.equal(1);
        });

        specify('混合文字列のコードポイント数を返す', () => {
            countUnicode('abc花子').should.equal(5);
        });

        specify('1文字は1を返す', () => {
            countUnicode('a').should.equal(1);
        });
    });
});

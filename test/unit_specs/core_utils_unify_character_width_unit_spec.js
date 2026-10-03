const should = require('chai').should();
const unifyCharacterWidth = require('../../src/core/utils/unify_character_width');

/************************************************************************
 * unifyCharacterWidth関数単体スペック
 *
 * 期待動作：全角英数字を半角に、半角カナを全角にそろえる
 * 備考：記号はそろえない
 ***********************************************************************/

describe('unifyCharacterWidth', () => {
    context('正常系', () => {
        specify('全角英数字を半角にする', () => {
            unifyCharacterWidth('ＡＢＣ１２３ａｂｃ').should.equal('ABC123abc');
        });

        specify('半角カナを全角にする', () => {
            unifyCharacterWidth('ﾊﾅｺｰ｡').should.equal('ハナコー。');
        });

        specify('半角カナの濁点・半濁点は合成する', () => {
            unifyCharacterWidth('ｶﾞﾊﾟ').should.equal('ガパ');
        });

        specify('全角の記号は変えない', () => {
            unifyCharacterWidth('おはよ～！？＆').should.equal('おはよ～！？＆');
        });

        specify('丸数字などの互換文字は変えない', () => {
            unifyCharacterWidth('①㈱').should.equal('①㈱');
        });

        specify('絵文字やキリル文字は変えない', () => {
            unifyCharacterWidth('😀привет').should.equal('😀привет');
        });

        specify('空文字列は空文字列を返す', () => {
            unifyCharacterWidth('').should.equal('');
        });
    });
});

const should = require('chai').should();
const CharacterWidthFormatter = require('../../src/domain/model/formatters/character_width_formatter');

/************************************************************************
 * CharacterWidthFormatterクラス単体スペック
 *
 * メソッド：#format
 * 期待動作：辞書と照合する前に文字種をそろえる
 * 備考：なし
 ***********************************************************************/

describe('CharacterWidthFormatter', () => {
    specify('typeはcharacter_widthを返す', () => {
        const fmt = new CharacterWidthFormatter();
        fmt.type.should.equal('character_width');
    });

    describe('#format', () => {
        context('正常系', () => {
            specify('全角英数字と半角カナをそろえる', () => {
                const fmt = new CharacterWidthFormatter();
                fmt.format('ｗｗｗ ﾊﾅｺ').should.equal('www ハナコ');
            });

            specify('空文字列は空文字列を返す', () => {
                const fmt = new CharacterWidthFormatter();
                fmt.format('').should.equal('');
            });
        });
    });
});

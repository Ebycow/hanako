const should = require('chai').should();
const LimitFormatter = require('../../src/domain/model/formatters/limit_formatter');
const { basicHanako } = require('../helpers/blueprints');

/************************************************************************
 * LimitFormatterクラス単体スペック
 *
 * メソッド：#format
 * 期待動作：maxCount以上の文字数をカットする
 * 備考：なし
 ***********************************************************************/

describe('LimitFormatter', () => {
    specify('typeはlimitを返す', () => {
        const fmt = new LimitFormatter(basicHanako());
        fmt.type.should.equal('limit');
    });

    describe('#format', () => {
        context('正常系', () => {
            specify('maxCount=0のとき制限なしでそのまま返す', () => {
                const hanako = basicHanako({ settings: { maxCount: 0 } });
                const fmt = new LimitFormatter(hanako);
                const longText = 'あ'.repeat(3000);
                fmt.format(longText).should.equal(longText);
            });

            specify('文字数が制限内ならそのまま返す', () => {
                const hanako = basicHanako({ settings: { maxCount: 10 } });
                const fmt = new LimitFormatter(hanako);
                fmt.format('あいうえお').should.equal('あいうえお');
            });

            specify('文字数が制限ちょうどならそのまま返す', () => {
                const hanako = basicHanako({ settings: { maxCount: 5 } });
                const fmt = new LimitFormatter(hanako);
                fmt.format('あいうえお').should.equal('あいうえお');
            });

            specify('文字数が制限超過なら切り詰めて省略記号を付加する', () => {
                const hanako = basicHanako({ settings: { maxCount: 3 } });
                const fmt = new LimitFormatter(hanako);
                const result = fmt.format('あいうえお');
                result.should.include('イか略。');
                result.length.should.be.lessThan('あいうえお'.length + 10);
            });

            specify('空文字列は空文字列を返す', () => {
                const hanako = basicHanako({ settings: { maxCount: 10 } });
                const fmt = new LimitFormatter(hanako);
                fmt.format('').should.equal('');
            });
        });
    });
});

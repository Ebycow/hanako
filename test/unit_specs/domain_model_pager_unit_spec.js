const should = require('chai').should();
const Pager = require('../../src/domain/model/pager');

/************************************************************************
 * Pagerドメインモデル単体スペック
 *
 * 期待動作：ページ管理機能を提供する
 * 備考：なし
 ***********************************************************************/

describe('Pager', () => {
    // テスト用Pageable
    function makePageable(lineCount, linesPerPage = 3) {
        const lines = [];
        for (let i = 0; i < lineCount; i++) {
            lines.push({ line: `行${i + 1}` });
        }
        return { lines, linesPerPage, descriptor: 'テスト辞書' };
    }

    describe('#lastIndex', () => {
        specify('行数がlinesPerPageで割り切れる場合', () => {
            const pager = new Pager(makePageable(6, 3));
            pager.lastIndex.should.equal(2);
        });

        specify('行数がlinesPerPageで割り切れない場合は切り上げ', () => {
            const pager = new Pager(makePageable(7, 3));
            pager.lastIndex.should.equal(3);
        });

        specify('行数が1ページ以内なら1', () => {
            const pager = new Pager(makePageable(2, 3));
            pager.lastIndex.should.equal(1);
        });
    });

    describe('#forward', () => {
        specify('ページを進める', () => {
            const pager = new Pager(makePageable(9, 3));
            pager.currentIndex.should.equal(1);
            pager.forward();
            pager.currentIndex.should.equal(2);
        });

        specify('最終ページでは進まない', () => {
            const pager = new Pager(makePageable(3, 3));
            pager.currentIndex.should.equal(1);
            pager.forward();
            pager.currentIndex.should.equal(1);
        });
    });

    describe('#backward', () => {
        specify('ページを戻す', () => {
            const pager = new Pager(makePageable(9, 3), 3);
            pager.currentIndex.should.equal(3);
            pager.backward();
            pager.currentIndex.should.equal(2);
        });

        specify('1ページ目では戻らない', () => {
            const pager = new Pager(makePageable(9, 3));
            pager.currentIndex.should.equal(1);
            pager.backward();
            pager.currentIndex.should.equal(1);
        });
    });

    describe('#lineables', () => {
        specify('現在のページの行を返す', () => {
            const pager = new Pager(makePageable(7, 3));
            const lines = pager.lineables();
            lines.should.have.lengthOf(3);
            lines[0].line.should.equal('行1');
            lines[2].line.should.equal('行3');
        });

        specify('2ページ目の行を返す', () => {
            const pager = new Pager(makePageable(7, 3), 2);
            const lines = pager.lineables();
            lines.should.have.lengthOf(3);
            lines[0].line.should.equal('行4');
        });

        specify('最終ページが端数のとき正しい行数を返す', () => {
            const pager = new Pager(makePageable(7, 3), 3);
            const lines = pager.lineables();
            lines.should.have.lengthOf(1);
            lines[0].line.should.equal('行7');
        });
    });

    describe('#show', () => {
        specify('ヘッダーと行を含む文字列を返す', () => {
            const pager = new Pager(makePageable(3, 3));
            const result = pager.show();
            result.should.be.a('string');
            result.should.include('テスト辞書');
            result.should.include('1 / 1 page');
            result.should.include('行1');
            result.should.include('行3');
        });

        specify('ページ番号が正しく表示される', () => {
            const pager = new Pager(makePageable(9, 3), 2);
            const result = pager.show();
            result.should.include('2 / 3 page');
        });
    });
});

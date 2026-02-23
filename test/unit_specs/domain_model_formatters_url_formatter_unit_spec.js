const should = require('chai').should();
const UrlFormatter = require('../../src/domain/model/formatters/url_formatter');

/************************************************************************
 * UrlFormatterクラス単体スペック
 *
 * メソッド：#format
 * 期待動作：文字列中のURLを'URL'に置換する
 * 備考：なし
 ***********************************************************************/

describe('UrlFormatter', () => {
    specify('typeはurlを返す', () => {
        const fmt = new UrlFormatter();
        fmt.type.should.equal('url');
    });

    describe('#format', () => {
        context('正常系', () => {
            specify('URLを含まないテキストはそのまま返す', () => {
                const fmt = new UrlFormatter();
                fmt.format('こんにちは花子').should.equal('こんにちは花子');
            });

            specify('http URLをURLに置換する', () => {
                const fmt = new UrlFormatter();
                fmt.format('見て http://example.com だよ').should.equal('見て URL だよ');
            });

            specify('https URLをURLに置換する', () => {
                const fmt = new UrlFormatter();
                fmt.format('https://example.com/path を見て').should.equal('URL を見て');
            });

            specify('複数のURLを全て置換する', () => {
                const fmt = new UrlFormatter();
                fmt.format('http://a.com と https://b.com').should.equal('URL と URL');
            });

            specify('空文字列は空文字列を返す', () => {
                const fmt = new UrlFormatter();
                fmt.format('').should.equal('');
            });
        });
    });
});

const should = require('chai').should();
const neutralizeUrls = require('../../src/core/utils/neutralize_urls');

/************************************************************************
 * neutralizeUrls関数単体スペック
 *
 * 期待動作：文字列中のURLを指定文字列に置換する
 * 備考：なし
 ***********************************************************************/

describe('neutralizeUrls', () => {
    context('正常系', () => {
        specify('URLを含まないテキストはそのまま返す', () => {
            neutralizeUrls('こんにちは花子').should.equal('こんにちは花子');
        });

        specify('http URLを置換する', () => {
            neutralizeUrls('見て http://example.com だよ').should.equal('見て URL だよ');
        });

        specify('https URLを置換する', () => {
            neutralizeUrls('見て https://example.com/path だよ').should.equal('見て URL だよ');
        });

        specify('複数のURLを全て置換する', () => {
            neutralizeUrls('http://a.com と https://b.com').should.equal('URL と URL');
        });

        specify('カスタム置換値を使用できる', () => {
            neutralizeUrls('見て https://example.com', 'リンク').should.equal('見て リンク');
        });

        specify('空文字列はそのまま返す', () => {
            neutralizeUrls('').should.equal('');
        });

        specify('ftp URLも置換する', () => {
            neutralizeUrls('ftp://files.example.com/data').should.equal('URL');
        });
    });
});

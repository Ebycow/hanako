const should = require('chai').should();
const { FoleyDictionaryLine } = require('../helpers/blueprints');

/************************************************************************
 * FoleyDictionaryLineクラス単体スペック
 *
 * 期待動作：SE辞書の一項目エンティティの構築・プロパティ
 * 備考：なし
 ***********************************************************************/

describe('FoleyDictionaryLine', () => {
    describe('構築', () => {
        specify('id, dictId, keyword, urlを正しく保持する', () => {
            const line = new FoleyDictionaryLine({
                id: 'fdl-1',
                dictId: 'fd-1',
                keyword: 'ドンッ',
                url: 'https://example.com/don.wav',
            });
            line.id.should.equal('fdl-1');
            line.dictId.should.equal('fd-1');
            line.keyword.should.equal('ドンッ');
            line.url.should.equal('https://example.com/don.wav');
        });

        specify('不正な引数でassertionエラー', () => {
            (() => new FoleyDictionaryLine({ id: 123, dictId: 'fd', keyword: 'x', url: 'u' })).should.throw();
            (() => new FoleyDictionaryLine({ id: 'x', dictId: 123, keyword: 'x', url: 'u' })).should.throw();
            (() => new FoleyDictionaryLine({ id: 'x', dictId: 'fd', keyword: 123, url: 'u' })).should.throw();
            (() => new FoleyDictionaryLine({ id: 'x', dictId: 'fd', keyword: 'x', url: 123 })).should.throw();
        });
    });

    describe('プロパティ', () => {
        specify('lineは「keyword ⇨ url」形式を返す', () => {
            const line = new FoleyDictionaryLine({
                id: 'fdl-1',
                dictId: 'fd-1',
                keyword: 'ドンッ',
                url: 'https://example.com/don.wav',
            });
            line.line.should.equal('ドンッ ⇨ https://example.com/don.wav');
        });

        specify('dataプロパティは書き換え不可', () => {
            const line = new FoleyDictionaryLine({
                id: 'fdl-1',
                dictId: 'fd-1',
                keyword: 'ドンッ',
                url: 'https://example.com/don.wav',
            });
            const original = line.data;
            line.data = {};
            line.data.should.equal(original);
        });
    });
});

const should = require('chai').should();
const CyrillicKatakanaFormatter = require('../../src/domain/model/formatters/cyrillic_katakana_formatter');

/************************************************************************
 * CyrillicKatakanaFormatterクラス単体スペック
 *
 * メソッド：#format
 * 期待動作：キリル文字をカタカナに音訳する
 * 備考：なし
 ***********************************************************************/

describe('CyrillicKatakanaFormatter', () => {
    specify('typeはcyrillic_katakanaを返す', () => {
        const fmt = new CyrillicKatakanaFormatter();
        fmt.type.should.equal('cyrillic_katakana');
    });

    describe('#format', () => {
        context('正常系', () => {
            specify('空文字列は空文字列を返す', () => {
                const fmt = new CyrillicKatakanaFormatter();
                fmt.format('').should.equal('');
            });

            specify('キリル文字を含まないテキストはそのまま返す', () => {
                const fmt = new CyrillicKatakanaFormatter();
                fmt.format('こんにちは花子').should.equal('こんにちは花子');
            });

            specify('単純な子音+母音の音節を変換する', () => {
                const fmt = new CyrillicKatakanaFormatter();
                fmt.format('ка').should.equal('カ');
            });

            specify('単語全体を変換する（привет）', () => {
                const fmt = new CyrillicKatakanaFormatter();
                fmt.format('привет').should.equal('プリヴェト');
            });

            specify('москваをモスクヴァに変換する', () => {
                const fmt = new CyrillicKatakanaFormatter();
                fmt.format('москва').should.equal('モスクヴァ');
            });
        });

        context('母音', () => {
            specify('語頭の母音аをアに変換する', () => {
                const fmt = new CyrillicKatakanaFormatter();
                fmt.format('а').should.equal('ア');
            });

            specify('語頭のеをイェに変換する', () => {
                const fmt = new CyrillicKatakanaFormatter();
                fmt.format('ел').should.equal('イェル');
            });

            specify('子音の後のеをエ行に変換する', () => {
                const fmt = new CyrillicKatakanaFormatter();
                fmt.format('не').should.equal('ネ');
            });

            specify('ёを語頭でヨに変換する', () => {
                const fmt = new CyrillicKatakanaFormatter();
                fmt.format('ёж').should.equal('ヨジュ');
            });

            specify('яを語頭でヤに変換する', () => {
                const fmt = new CyrillicKatakanaFormatter();
                fmt.format('яма').should.equal('ヤマ');
            });

            specify('юを語頭でユに変換する', () => {
                const fmt = new CyrillicKatakanaFormatter();
                fmt.format('юг').should.equal('ユグ');
            });

            specify('ыをウイに変換する', () => {
                const fmt = new CyrillicKatakanaFormatter();
                fmt.format('ты').should.equal('トウイ');
            });
        });

        context('子音連続', () => {
            specify('子音連続をデフォルト母音で処理する', () => {
                const fmt = new CyrillicKatakanaFormatter();
                fmt.format('стр').should.equal('ストル');
            });

            specify('語末の子音にデフォルト母音を付加する', () => {
                const fmt = new CyrillicKatakanaFormatter();
                fmt.format('кот').should.equal('コト');
            });
        });

        context('特殊文字', () => {
            specify('軟音記号ьで口蓋化する', () => {
                const fmt = new CyrillicKatakanaFormatter();
                fmt.format('мать').should.equal('マティ');
            });

            specify('硬音記号ъは区切りとして機能する', () => {
                const fmt = new CyrillicKatakanaFormatter();
                fmt.format('объект').should.equal('オブイェクト');
            });

            specify('йをイに変換する', () => {
                const fmt = new CyrillicKatakanaFormatter();
                fmt.format('май').should.equal('マイ');
            });
        });

        context('混在テキスト', () => {
            specify('キリル文字と日本語の混在テキストを処理する', () => {
                const fmt = new CyrillicKatakanaFormatter();
                fmt.format('こんにちは привет').should.equal('こんにちは プリヴェト');
            });

            specify('キリル文字と英語の混在テキストを処理する', () => {
                const fmt = new CyrillicKatakanaFormatter();
                fmt.format('hello мир world').should.equal('hello ミル world');
            });

            specify('複数のキリル文字セグメントを変換する', () => {
                const fmt = new CyrillicKatakanaFormatter();
                fmt.format('да и нет').should.equal('ダ イ ネト');
            });
        });

        context('大文字小文字', () => {
            specify('大文字キリル文字を処理する', () => {
                const fmt = new CyrillicKatakanaFormatter();
                fmt.format('ПРИВЕТ').should.equal('プリヴェト');
            });

            specify('大小文字混在を処理する', () => {
                const fmt = new CyrillicKatakanaFormatter();
                fmt.format('Москва').should.equal('モスクヴァ');
            });
        });
    });
});

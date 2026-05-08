const should = require('chai').should();
const Formato = require('../../src/domain/model/formato');
const { basicHanako, wordDictionaryLineBlueprint, WordDictionary } = require('../helpers/blueprints');

/************************************************************************
 * Formatoクラス単体スペック
 *
 * メソッド：#normalize
 * 期待動作：URL→辞書→文字数制限の順にフォーマットする
 * 備考：なし
 ***********************************************************************/

describe('Formato', () => {
    describe('#normalize', () => {
        context('正常系', () => {
            specify('URLを置換してから辞書置換する', () => {
                const line = wordDictionaryLineBlueprint({ from: '花子', to: 'はなこ' });
                const wd = new WordDictionary({ id: 'wd', serverId: 'mock-server-id', lines: [line] });
                const hanako = basicHanako({ wordDictionary: wd });
                const formato = new Formato(hanako);
                const result = formato.normalize('花子 https://example.com');
                result.should.equal('はなこ URL');
            });

            specify('文字数制限が適用される', () => {
                const hanako = basicHanako({ settings: { maxCount: 5 } });
                const formato = new Formato(hanako);
                const result = formato.normalize('あいうえおかきくけこ');
                result.should.include('イか略。');
            });

            specify('制限なし・辞書なし・URLなしのテキストはそのまま返す', () => {
                const formato = new Formato(basicHanako());
                formato.normalize('普通のテキスト').should.equal('普通のテキスト');
            });

            specify('空文字列は空文字列を返す', () => {
                const formato = new Formato(basicHanako());
                formato.normalize('').should.equal('');
            });

            specify('キリル文字をカタカナに変換する', () => {
                const formato = new Formato(basicHanako());
                const result = formato.normalize('привет');
                result.should.be.a('string');
                result.should.not.match(/[а-яА-ЯёЁ]/);
                result.should.equal('プリヴェト');
            });

            specify('辞書置換がキリル文字変換より先に適用される', () => {
                const line = wordDictionaryLineBlueprint({ from: 'привет', to: 'プリヴェート' });
                const wd = new WordDictionary({ id: 'wd', serverId: 'mock-server-id', lines: [line] });
                const hanako = basicHanako({ wordDictionary: wd });
                const formato = new Formato(hanako);
                formato.normalize('привет мир').should.equal('プリヴェート ミル');
            });
        });
    });
});

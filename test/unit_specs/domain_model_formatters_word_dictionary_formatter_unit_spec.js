const should = require('chai').should();
const WordDictionaryFormatter = require('../../src/domain/model/formatters/word_dictionary_formatter');
const { basicHanako, wordDictionaryLineBlueprint, WordDictionary } = require('../helpers/blueprints');

/************************************************************************
 * WordDictionaryFormatterクラス単体スペック
 *
 * メソッド：#format
 * 期待動作：辞書に基づいて単語を置換する
 * 備考：なし
 ***********************************************************************/

describe('WordDictionaryFormatter', () => {
    specify('typeはword_dictionaryを返す', () => {
        const fmt = new WordDictionaryFormatter(basicHanako());
        fmt.type.should.equal('word_dictionary');
    });

    describe('#format', () => {
        context('正常系', () => {
            specify('辞書が空ならテキストをそのまま返す', () => {
                const fmt = new WordDictionaryFormatter(basicHanako());
                fmt.format('花子は元気です').should.equal('花子は元気です');
            });

            specify('辞書の単語を置換する', () => {
                const line = wordDictionaryLineBlueprint({ from: '花子', to: 'はなこ' });
                const wd = new WordDictionary({ id: 'wd', serverId: 'mock-server-id', lines: [line] });
                const fmt = new WordDictionaryFormatter(basicHanako({ wordDictionary: wd }));
                fmt.format('花子は元気です').should.equal('はなこは元気です');
            });

            specify('複数の辞書エントリを置換する', () => {
                const line1 = wordDictionaryLineBlueprint({ id: 'wdl-1', from: '花子', to: 'はなこ' });
                const line2 = wordDictionaryLineBlueprint({ id: 'wdl-2', from: '元気', to: 'げんき' });
                const wd = new WordDictionary({ id: 'wd', serverId: 'mock-server-id', lines: [line1, line2] });
                const fmt = new WordDictionaryFormatter(basicHanako({ wordDictionary: wd }));
                fmt.format('花子は元気です').should.equal('はなこはげんきです');
            });

            specify('一致しない場合はそのまま返す', () => {
                const line = wordDictionaryLineBlueprint({ from: '太郎', to: 'たろう' });
                const wd = new WordDictionary({ id: 'wd', serverId: 'mock-server-id', lines: [line] });
                const fmt = new WordDictionaryFormatter(basicHanako({ wordDictionary: wd }));
                fmt.format('花子は元気です').should.equal('花子は元気です');
            });

            specify('空文字列は空文字列を返す', () => {
                const fmt = new WordDictionaryFormatter(basicHanako());
                fmt.format('').should.equal('');
            });
        });
    });
});

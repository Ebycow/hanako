const should = require('chai').should();
const WordDictionaryFormatter = require('../../src/domain/model/formatters/word_dictionary_formatter');
const {
    basicHanako,
    wordDictionaryLineBlueprint,
    foleyDictionaryLineBlueprint,
    WordDictionary,
    FoleyDictionary,
} = require('../helpers/blueprints');

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

            specify('登録済みSE名の中では辞書の単語を置換しない', () => {
                const wordLine = wordDictionaryLineBlueprint({ from: 'CPU', to: 'シーピーユー' });
                const wordDictionary = new WordDictionary({
                    id: 'wd',
                    serverId: 'mock-server-id',
                    lines: [wordLine],
                });
                const foleyLine = foleyDictionaryLineBlueprint({ keyword: 'CPU警告音' });
                const foleyDictionary = new FoleyDictionary({
                    id: 'fd',
                    serverId: 'mock-server-id',
                    lines: [foleyLine],
                });
                const fmt = new WordDictionaryFormatter(basicHanako({ wordDictionary, foleyDictionary }));

                fmt.format('CPUの次にCPU警告音を流す').should.equal('シーピーユーの次にCPU警告音を流す');
            });

            specify('教育辞書とSEが完全に重複する場合はSE名を優先する', () => {
                const wordLine = wordDictionaryLineBlueprint({ from: 'SE開始', to: 'エスイー開始' });
                const wordDictionary = new WordDictionary({
                    id: 'wd',
                    serverId: 'mock-server-id',
                    lines: [wordLine],
                });
                const foleyLine = foleyDictionaryLineBlueprint({ keyword: 'SE開始' });
                const foleyDictionary = new FoleyDictionary({
                    id: 'fd',
                    serverId: 'mock-server-id',
                    lines: [foleyLine],
                });
                const fmt = new WordDictionaryFormatter(basicHanako({ wordDictionary, foleyDictionary }));

                fmt.format('SE開始').should.equal('SE開始');
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

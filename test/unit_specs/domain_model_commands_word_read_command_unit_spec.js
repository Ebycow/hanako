const should = require('chai').should();
const WordReadCommand = require('../../src/domain/model/commands/word_read_command');
const {
    basicHanako,
    commandInputBlueprint,
    wordDictionaryLineBlueprint,
    WordDictionary,
} = require('../helpers/blueprints');

/************************************************************************
 * WordReadCommandクラス単体スペック
 *
 * メソッド：#process
 * 期待動作：教育単語一覧ページャーレスポンスの返却
 * 備考：なし
 ***********************************************************************/

describe('WordReadCommand', () => {
    describe('Commandクラスメタスペック', () => {
        specify('typeは文字列を返す', () => {
            const sub = new WordReadCommand(basicHanako());
            sub.type.should.be.a('string');
        });

        specify('namesは静的に文字列の配列を返す', () => {
            WordReadCommand.names.should.be.an('array').that.is.not.empty;
            WordReadCommand.names.forEach((name) => name.should.be.a('string'));
        });

        specify('processメソッドを持つ', () => {
            const sub = new WordReadCommand(basicHanako());
            sub.process.should.be.a('function');
        });
    });

    describe('#process', () => {
        context('正常系', () => {
            specify('辞書にエントリがあればページャーレスポンスを返す', () => {
                const line = wordDictionaryLineBlueprint({ from: '花子', to: 'はなこ' });
                const wd = new WordDictionary({ id: 'wd', serverId: 'mock-server-id', lines: [line] });
                const input = commandInputBlueprint();
                const sub = new WordReadCommand(basicHanako({ wordDictionary: wd }));
                const res = sub.process(input);

                res.type.should.equal('chat');
                res.code.should.equal('pager');
                res.content.should.include('花子');
            });
        });

        context('異常系', () => {
            specify('辞書が空ならエラーレスポンスを返す', () => {
                const input = commandInputBlueprint();
                const sub = new WordReadCommand(basicHanako());
                const res = sub.process(input);

                res.type.should.equal('chat');
                res.code.should.equal('error');
            });
        });
    });
});

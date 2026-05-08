const should = require('chai').should();
const WordClearCommand = require('../../src/domain/model/commands/word_clear_command');
const {
    basicHanako,
    commandInputBlueprint,
    wordDictionaryLineBlueprint,
    WordDictionary,
} = require('../helpers/blueprints');

/************************************************************************
 * WordClearCommandクラス単体スペック
 *
 * メソッド：#process
 * 期待動作：教育単語初期化アクションレスポンスの返却
 * 備考：なし
 ***********************************************************************/

describe('WordClearCommand', () => {
    describe('Commandクラスメタスペック', () => {
        specify('typeは文字列を返す', () => {
            const line = wordDictionaryLineBlueprint();
            const wd = new WordDictionary({ id: 'wd', serverId: 'mock-server-id', lines: [line] });
            const sub = new WordClearCommand(basicHanako({ wordDictionary: wd }));
            sub.type.should.be.a('string');
        });

        specify('namesは静的に文字列の配列を返す', () => {
            WordClearCommand.names.should.be.an('array').that.is.not.empty;
            WordClearCommand.names.forEach((name) => name.should.be.a('string'));
        });

        specify('processメソッドを持つ', () => {
            const line = wordDictionaryLineBlueprint();
            const wd = new WordDictionary({ id: 'wd', serverId: 'mock-server-id', lines: [line] });
            const sub = new WordClearCommand(basicHanako({ wordDictionary: wd }));
            sub.process.should.be.a('function');
        });
    });

    describe('#process', () => {
        context('正常系', () => {
            specify('--forceで正しい初期化アクションレスポンスを返す', () => {
                const line = wordDictionaryLineBlueprint();
                const wd = new WordDictionary({ id: 'wd', serverId: 'mock-server-id', lines: [line] });
                const input = commandInputBlueprint({ argc: 1, argv: ['--force'] });
                const sub = new WordClearCommand(basicHanako({ wordDictionary: wd }));
                const res = sub.process(input);

                res.type.should.equal('action');
                res.action.type.should.equal('word_clear');
                res.onSuccess.type.should.equal('chat');
            });
        });

        context('異常系', () => {
            specify('辞書が空ならエラー', () => {
                const input = commandInputBlueprint({ argc: 1, argv: ['--force'] });
                const sub = new WordClearCommand(basicHanako());
                const res = sub.process(input);

                res.type.should.equal('chat');
                res.code.should.equal('error');
            });

            specify('--forceなしなら確認メッセージを返す', () => {
                const line = wordDictionaryLineBlueprint();
                const wd = new WordDictionary({ id: 'wd', serverId: 'mock-server-id', lines: [line] });
                const input = commandInputBlueprint({ argc: 0, argv: [] });
                const sub = new WordClearCommand(basicHanako({ wordDictionary: wd }));
                const res = sub.process(input);

                res.type.should.equal('chat');
                res.code.should.equal('force');
                res.content.should.include('--force');
            });
        });
    });
});

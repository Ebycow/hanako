const should = require('chai').should();
const WordDeleteCommand = require('../../src/domain/model/commands/word_delete_command');
const {
    basicHanako,
    commandInputBlueprint,
    wordDictionaryLineBlueprint,
    WordDictionary,
} = require('../helpers/blueprints');

/************************************************************************
 * WordDeleteCommandクラス単体スペック
 *
 * メソッド：#process
 * 期待動作：教育単語削除アクションレスポンスの返却
 * 備考：なし
 ***********************************************************************/

describe('WordDeleteCommand', () => {
    describe('Commandクラスメタスペック', () => {
        specify('typeは文字列を返す', () => {
            const sub = new WordDeleteCommand(basicHanako());
            sub.type.should.be.a('string');
        });

        specify('namesは静的に文字列の配列を返す', () => {
            WordDeleteCommand.names.should.be.an('array').that.is.not.empty;
            WordDeleteCommand.names.forEach((name) => name.should.be.a('string'));
        });

        specify('processメソッドを持つ', () => {
            const sub = new WordDeleteCommand(basicHanako());
            sub.process.should.be.a('function');
        });
    });

    describe('#process', () => {
        context('正常系', () => {
            specify('存在する単語を削除するアクションレスポンスを返す', () => {
                const line = wordDictionaryLineBlueprint({ from: '花子', to: 'はなこ' });
                const wd = new WordDictionary({ id: 'wd', serverId: 'mock-server-id', lines: [line] });
                const input = commandInputBlueprint({ argc: 1, argv: ['花子'] });
                const sub = new WordDeleteCommand(basicHanako({ wordDictionary: wd }));
                const res = sub.process(input);

                res.type.should.equal('action');
                res.action.type.should.equal('word_delete');
                res.onSuccess.content.should.include('花子');
            });
        });

        context('異常系', () => {
            specify('引数なしはエラー', () => {
                const input = commandInputBlueprint({ argc: 0, argv: [] });
                const sub = new WordDeleteCommand(basicHanako());
                const res = sub.process(input);

                res.type.should.equal('chat');
                res.code.should.equal('error');
            });

            specify('存在しない単語はエラー', () => {
                const input = commandInputBlueprint({ argc: 1, argv: ['存在しない'] });
                const sub = new WordDeleteCommand(basicHanako());
                const res = sub.process(input);

                res.type.should.equal('chat');
                res.code.should.equal('error');
            });
        });
    });
});

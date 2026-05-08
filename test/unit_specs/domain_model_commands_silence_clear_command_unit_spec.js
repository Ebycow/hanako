const should = require('chai').should();
const SilenceClearCommand = require('../../src/domain/model/commands/silence_clear_command');
const {
    basicHanako,
    commandInputBlueprint,
    silenceDictionaryLineBlueprint,
    SilenceDictionary,
} = require('../helpers/blueprints');

/************************************************************************
 * SilenceClearCommandクラス単体スペック
 *
 * メソッド：#process
 * 期待動作：沈黙ユーザー初期化アクションレスポンスの返却
 * 備考：なし
 ***********************************************************************/

describe('SilenceClearCommand', () => {
    describe('Commandクラスメタスペック', () => {
        specify('typeは文字列を返す', () => {
            const line = silenceDictionaryLineBlueprint();
            const sd = new SilenceDictionary({ id: 'sd', serverId: 'mock-server-id', lines: [line] });
            const sub = new SilenceClearCommand(basicHanako({ silenceDictionary: sd }));
            sub.type.should.be.a('string');
        });

        specify('namesは静的に文字列の配列を返す', () => {
            SilenceClearCommand.names.should.be.an('array').that.is.not.empty;
            SilenceClearCommand.names.forEach((name) => name.should.be.a('string'));
        });

        specify('processメソッドを持つ', () => {
            const line = silenceDictionaryLineBlueprint();
            const sd = new SilenceDictionary({ id: 'sd', serverId: 'mock-server-id', lines: [line] });
            const sub = new SilenceClearCommand(basicHanako({ silenceDictionary: sd }));
            sub.process.should.be.a('function');
        });
    });

    describe('#process', () => {
        context('正常系', () => {
            specify('--forceで正しい初期化アクションレスポンスを返す', () => {
                const line = silenceDictionaryLineBlueprint();
                const sd = new SilenceDictionary({ id: 'sd', serverId: 'mock-server-id', lines: [line] });
                const input = commandInputBlueprint({ argc: 1, argv: ['--force'] });
                const sub = new SilenceClearCommand(basicHanako({ silenceDictionary: sd }));
                const res = sub.process(input);

                res.type.should.equal('action');
                res.action.type.should.equal('silence_clear');
                res.onSuccess.type.should.equal('chat');
            });
        });

        context('異常系', () => {
            specify('沈黙ユーザーがいなければエラー', () => {
                const input = commandInputBlueprint({ argc: 1, argv: ['--force'] });
                const sub = new SilenceClearCommand(basicHanako());
                const res = sub.process(input);

                res.type.should.equal('chat');
                res.code.should.equal('error');
            });

            specify('--forceなしなら確認メッセージを返す', () => {
                const line = silenceDictionaryLineBlueprint();
                const sd = new SilenceDictionary({ id: 'sd', serverId: 'mock-server-id', lines: [line] });
                const input = commandInputBlueprint({ argc: 0, argv: [] });
                const sub = new SilenceClearCommand(basicHanako({ silenceDictionary: sd }));
                const res = sub.process(input);

                res.type.should.equal('chat');
                res.code.should.equal('force');
                res.content.should.include('--force');
            });
        });
    });
});

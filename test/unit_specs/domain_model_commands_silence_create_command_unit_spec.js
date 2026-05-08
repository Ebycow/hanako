const should = require('chai').should();
const SilenceCreateCommand = require('../../src/domain/model/commands/silence_create_command');
const {
    basicHanako,
    commandInputBlueprint,
    dmessageBlueprint,
    silenceDictionaryLineBlueprint,
    SilenceDictionary,
} = require('../helpers/blueprints');

/************************************************************************
 * SilenceCreateCommandクラス単体スペック
 *
 * メソッド：#process
 * 期待動作：沈黙ユーザー追加アクションレスポンスの返却
 * 備考：なし
 ***********************************************************************/

describe('SilenceCreateCommand', () => {
    describe('Commandクラスメタスペック', () => {
        specify('typeは文字列を返す', () => {
            const sub = new SilenceCreateCommand(basicHanako());
            sub.type.should.be.a('string');
        });

        specify('namesは静的に文字列の配列を返す', () => {
            SilenceCreateCommand.names.should.be.an('array').that.is.not.empty;
            SilenceCreateCommand.names.forEach((name) => name.should.be.a('string'));
        });

        specify('processメソッドを持つ', () => {
            const sub = new SilenceCreateCommand(basicHanako());
            sub.process.should.be.a('function');
        });
    });

    describe('#process', () => {
        context('正常系', () => {
            specify('正しい沈黙アクションレスポンスを返す', () => {
                const mentions = new Map([['Ebycow', 'user-001']]);
                const origin = dmessageBlueprint({ mentionedUsers: mentions });
                const input = commandInputBlueprint({ argc: 1, argv: ['@Ebycow'], origin });
                const sub = new SilenceCreateCommand(basicHanako());
                const res = sub.process(input);

                res.type.should.equal('action');
                res.action.type.should.equal('silence_create');
                res.action.userId.should.equal('user-001');
                res.onSuccess.content.should.include('Ebycow');
            });
        });

        context('異常系', () => {
            specify('引数なしはエラー', () => {
                const input = commandInputBlueprint({ argc: 0, argv: [] });
                const sub = new SilenceCreateCommand(basicHanako());
                const res = sub.process(input);

                res.type.should.equal('chat');
                res.code.should.equal('error');
            });

            specify('@で始まらない引数はエラー', () => {
                const input = commandInputBlueprint({ argc: 1, argv: ['Ebycow'] });
                const sub = new SilenceCreateCommand(basicHanako());
                const res = sub.process(input);

                res.type.should.equal('chat');
                res.code.should.equal('error');
            });

            specify('メンションユーザーに存在しないユーザーはエラー', () => {
                const input = commandInputBlueprint({ argc: 1, argv: ['@Unknown'] });
                const sub = new SilenceCreateCommand(basicHanako());
                const res = sub.process(input);

                res.type.should.equal('chat');
                res.code.should.equal('error');
            });

            specify('既に沈黙中のユーザーはエラー', () => {
                const mentions = new Map([['Ebycow', 'user-001']]);
                const origin = dmessageBlueprint({ mentionedUsers: mentions });
                const input = commandInputBlueprint({ argc: 1, argv: ['@Ebycow'], origin });
                const line = silenceDictionaryLineBlueprint({ userId: 'user-001' });
                const sd = new SilenceDictionary({ id: 'sd', serverId: 'mock-server-id', lines: [line] });
                const sub = new SilenceCreateCommand(basicHanako({ silenceDictionary: sd }));
                const res = sub.process(input);

                res.type.should.equal('chat');
                res.code.should.equal('error');
            });
        });
    });
});

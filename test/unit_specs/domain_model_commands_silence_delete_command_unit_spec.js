const should = require('chai').should();
const SilenceDeleteCommand = require('../../src/domain/model/commands/silence_delete_command');
const {
    basicHanako,
    commandInputBlueprint,
    dmessageBlueprint,
    silenceDictionaryLineBlueprint,
    SilenceDictionary,
} = require('../helpers/blueprints');

/************************************************************************
 * SilenceDeleteCommandクラス単体スペック
 *
 * メソッド：#process
 * 期待動作：沈黙ユーザー削除アクションレスポンスの返却
 * 備考：なし
 ***********************************************************************/

describe('SilenceDeleteCommand', () => {
    describe('Commandクラスメタスペック', () => {
        specify('typeは文字列を返す', () => {
            const sub = new SilenceDeleteCommand(basicHanako());
            sub.type.should.be.a('string');
        });

        specify('namesは静的に文字列の配列を返す', () => {
            SilenceDeleteCommand.names.should.be.an('array').that.is.not.empty;
            SilenceDeleteCommand.names.forEach((name) => name.should.be.a('string'));
        });

        specify('processメソッドを持つ', () => {
            const sub = new SilenceDeleteCommand(basicHanako());
            sub.process.should.be.a('function');
        });
    });

    describe('#process', () => {
        context('正常系', () => {
            specify('存在する沈黙ユーザーを削除するアクションレスポンスを返す', () => {
                const mentions = new Map([['Ebycow', 'user-001']]);
                const origin = dmessageBlueprint({ mentionedUsers: mentions });
                const input = commandInputBlueprint({ argc: 1, argv: ['@Ebycow'], origin });
                const line = silenceDictionaryLineBlueprint({ userId: 'user-001' });
                const sd = new SilenceDictionary({ id: 'sd', serverId: 'mock-server-id', lines: [line] });
                const sub = new SilenceDeleteCommand(basicHanako({ silenceDictionary: sd }));
                const res = sub.process(input);

                res.type.should.equal('action');
                res.action.type.should.equal('silence_delete');
                res.onSuccess.content.should.include('Ebycow');
            });
        });

        context('異常系', () => {
            specify('引数なしはエラー', () => {
                const input = commandInputBlueprint({ argc: 0, argv: [] });
                const sub = new SilenceDeleteCommand(basicHanako());
                const res = sub.process(input);

                res.type.should.equal('chat');
                res.code.should.equal('error');
            });

            specify('@で始まらない引数はエラー', () => {
                const input = commandInputBlueprint({ argc: 1, argv: ['Ebycow'] });
                const sub = new SilenceDeleteCommand(basicHanako());
                const res = sub.process(input);

                res.type.should.equal('chat');
                res.code.should.equal('error');
            });

            specify('メンションに存在しないユーザーはエラー', () => {
                const input = commandInputBlueprint({ argc: 1, argv: ['@Unknown'] });
                const sub = new SilenceDeleteCommand(basicHanako());
                const res = sub.process(input);

                res.type.should.equal('chat');
                res.code.should.equal('error');
            });

            specify('沈黙中でないユーザーはエラー', () => {
                const mentions = new Map([['Ebycow', 'user-001']]);
                const origin = dmessageBlueprint({ mentionedUsers: mentions });
                const input = commandInputBlueprint({ argc: 1, argv: ['@Ebycow'], origin });
                const sub = new SilenceDeleteCommand(basicHanako());
                const res = sub.process(input);

                res.type.should.equal('chat');
                res.code.should.equal('error');
            });
        });
    });
});

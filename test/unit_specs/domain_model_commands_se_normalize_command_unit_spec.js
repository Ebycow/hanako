const should = require('chai').should();
const SeNormalizeCommand = require('../../src/domain/model/commands/se_normalize_command');
const { basicHanako, commandInputBlueprint } = require('../helpers/blueprints');

/************************************************************************
 * SeNormalizeCommandクラス単体スペック
 *
 * メソッド：#process
 * 期待動作：SE正規化更新アクションレスポンスの返却
 * 備考：なし
 ***********************************************************************/

describe('SeNormalizeCommand', () => {
    describe('Commandクラスメタスペック', () => {
        specify('typeは文字列を返す', () => {
            const sub = new SeNormalizeCommand(basicHanako());
            sub.type.should.be.a('string');
        });

        specify('namesは静的に文字列の配列を返す', () => {
            SeNormalizeCommand.names.should.be.an('array').that.is.not.empty;
            SeNormalizeCommand.names.forEach((name) => name.should.be.a('string'));
        });

        specify('processメソッドを持つ', () => {
            const sub = new SeNormalizeCommand(basicHanako());
            sub.process.should.be.a('function');
        });
    });

    describe('#process', () => {
        context('正常系', () => {
            specify('正しいSE正規化更新アクションレスポンスを返す', () => {
                const input = commandInputBlueprint({ argc: 1, argv: ['80'] });
                const sub = new SeNormalizeCommand(basicHanako());
                const res = sub.process(input);

                res.type.should.equal('action');
                res.action.type.should.equal('se_normalize_update');
                res.action.seNormalize.should.equal(80);
                res.onSuccess.type.should.equal('chat');
                res.onSuccess.content.should.include('80');
            });

            specify('0を指定すると無効メッセージを返す', () => {
                const input = commandInputBlueprint({ argc: 1, argv: ['0'] });
                const sub = new SeNormalizeCommand(basicHanako());
                const res = sub.process(input);

                res.type.should.equal('action');
                res.action.seNormalize.should.equal(0);
                res.onSuccess.content.should.include('無効');
            });

            specify('50（デフォルト）を指定しても正常', () => {
                const input = commandInputBlueprint({ argc: 1, argv: ['50'] });
                const sub = new SeNormalizeCommand(basicHanako());
                const res = sub.process(input);

                res.type.should.equal('action');
                res.action.seNormalize.should.equal(50);
            });

            specify('100を指定しても正常', () => {
                const input = commandInputBlueprint({ argc: 1, argv: ['100'] });
                const sub = new SeNormalizeCommand(basicHanako());
                const res = sub.process(input);

                res.type.should.equal('action');
                res.action.seNormalize.should.equal(100);
            });
        });

        context('異常系', () => {
            specify('引数なしはエラー', () => {
                const input = commandInputBlueprint({ argc: 0, argv: [] });
                const sub = new SeNormalizeCommand(basicHanako());
                const res = sub.process(input);

                res.type.should.equal('chat');
                res.code.should.equal('error');
            });

            specify('数値以外はエラー', () => {
                const input = commandInputBlueprint({ argc: 1, argv: ['abc'] });
                const sub = new SeNormalizeCommand(basicHanako());
                const res = sub.process(input);

                res.type.should.equal('chat');
                res.code.should.equal('error');
            });

            specify('マイナスはエラー', () => {
                const input = commandInputBlueprint({ argc: 1, argv: ['-1'] });
                const sub = new SeNormalizeCommand(basicHanako());
                const res = sub.process(input);

                res.type.should.equal('chat');
                res.code.should.equal('error');
            });

            specify('101以上はエラー', () => {
                const input = commandInputBlueprint({ argc: 1, argv: ['101'] });
                const sub = new SeNormalizeCommand(basicHanako());
                const res = sub.process(input);

                res.type.should.equal('chat');
                res.code.should.equal('error');
            });

            specify('小数はエラー', () => {
                const input = commandInputBlueprint({ argc: 1, argv: ['50.5'] });
                const sub = new SeNormalizeCommand(basicHanako());
                const res = sub.process(input);

                res.type.should.equal('chat');
                res.code.should.equal('error');
            });
        });
    });
});

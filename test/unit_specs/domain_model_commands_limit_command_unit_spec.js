const should = require('chai').should();
const LimitCommand = require('../../src/domain/model/commands/limit_command');
const { basicHanako, commandInputBlueprint } = require('../helpers/blueprints');

/************************************************************************
 * LimitCommandクラス単体スペック
 *
 * メソッド：#process
 * 期待動作：最大読み上げ文字数制限アクションレスポンスの返却
 * 備考：なし
 ***********************************************************************/

describe('LimitCommand', () => {
    describe('Commandクラスメタスペック', () => {
        specify('typeは文字列を返す', () => {
            const sub = new LimitCommand(basicHanako());
            sub.type.should.be.a('string');
        });

        specify('namesは静的に文字列の配列を返す', () => {
            LimitCommand.names.should.be.an('array').that.is.not.empty;
            LimitCommand.names.forEach((name) => name.should.be.a('string'));
        });

        specify('processメソッドを持つ', () => {
            const sub = new LimitCommand(basicHanako());
            sub.process.should.be.a('function');
        });
    });

    describe('#process', () => {
        context('正常系', () => {
            specify('正しい文字数制限アクションレスポンスを返す', () => {
                const input = commandInputBlueprint({ argc: 1, argv: ['500'] });
                const sub = new LimitCommand(basicHanako());
                const res = sub.process(input);

                res.type.should.equal('action');
                res.action.type.should.equal('max_count_update');
                res.action.maxCount.should.equal(500);
                res.onSuccess.type.should.equal('chat');
                res.onSuccess.content.should.include('500');
            });

            specify('0を指定すると制限解除メッセージを返す', () => {
                const input = commandInputBlueprint({ argc: 1, argv: ['0'] });
                const sub = new LimitCommand(basicHanako());
                const res = sub.process(input);

                res.type.should.equal('action');
                res.action.maxCount.should.equal(0);
                res.onSuccess.content.should.include('解除');
            });

            specify('2000を指定しても正常', () => {
                const input = commandInputBlueprint({ argc: 1, argv: ['2000'] });
                const sub = new LimitCommand(basicHanako());
                const res = sub.process(input);

                res.type.should.equal('action');
                res.action.maxCount.should.equal(2000);
            });
        });

        context('異常系', () => {
            specify('引数なしはエラー', () => {
                const input = commandInputBlueprint({ argc: 0, argv: [] });
                const sub = new LimitCommand(basicHanako());
                const res = sub.process(input);

                res.type.should.equal('chat');
                res.code.should.equal('error');
            });

            specify('数値以外はエラー', () => {
                const input = commandInputBlueprint({ argc: 1, argv: ['abc'] });
                const sub = new LimitCommand(basicHanako());
                const res = sub.process(input);

                res.type.should.equal('chat');
                res.code.should.equal('error');
            });

            specify('マイナスはエラー', () => {
                const input = commandInputBlueprint({ argc: 1, argv: ['-1'] });
                const sub = new LimitCommand(basicHanako());
                const res = sub.process(input);

                res.type.should.equal('chat');
                res.code.should.equal('error');
            });

            specify('2001以上はエラー', () => {
                const input = commandInputBlueprint({ argc: 1, argv: ['2001'] });
                const sub = new LimitCommand(basicHanako());
                const res = sub.process(input);

                res.type.should.equal('chat');
                res.code.should.equal('error');
            });
        });
    });
});

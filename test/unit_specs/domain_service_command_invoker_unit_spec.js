const should = require('chai').should();
const CommandInvoker = require('../../src/domain/service/command_invoker');
const EbyAbortError = require('../../src/core/errors/eby_abort_error');
const { basicHanako, commandInputBlueprint } = require('../helpers/blueprints');

/************************************************************************
 * CommandInvokerクラス単体スペック
 *
 * メソッド：#invoke
 * 期待動作：コマンド引数からコマンドを解決し実行してレスポンスを返す
 * 備考：内部でCommando/Commandを使用するが直接テスト可能
 ***********************************************************************/

describe('CommandInvoker', () => {
    describe('#invoke', () => {
        context('正常系', () => {
            specify('既知のコマンドを実行してレスポンスを返す', async () => {
                const invoker = new CommandInvoker();
                const hanako = basicHanako();
                const input = commandInputBlueprint({ argc: 1, argv: ['help'] });
                const response = await invoker.invoke(hanako, input);
                response.type.should.equal('chat');
            });

            specify('引数付きコマンドを実行できる', async () => {
                const invoker = new CommandInvoker();
                const hanako = basicHanako();
                const input = commandInputBlueprint({ argc: 2, argv: ['limit', '100'] });
                const response = await invoker.invoke(hanako, input);
                response.type.should.equal('action');
            });
        });

        context('異常系', () => {
            specify('未知のコマンドはabortする', async () => {
                const invoker = new CommandInvoker();
                const hanako = basicHanako();
                const input = commandInputBlueprint({ argc: 1, argv: ['unknown_xyz'] });
                try {
                    await invoker.invoke(hanako, input);
                    should.fail('should have rejected');
                } catch (e) {
                    e.should.be.instanceOf(EbyAbortError);
                }
            });
        });
    });
});

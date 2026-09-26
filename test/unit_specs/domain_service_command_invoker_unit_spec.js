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

            specify('プリフィクス付きの普通の文章はabortする（「>」で読み上げを回避する用途）', async () => {
                const invoker = new CommandInvoker();
                const hanako = basicHanako();
                // ">今日は眠い ねる" のような投稿がパースされた後の形
                const input = commandInputBlueprint({ argc: 2, argv: ['今日は眠い', 'ねる'] });
                try {
                    await invoker.invoke(hanako, input);
                    should.fail('should have rejected');
                } catch (e) {
                    e.should.be.instanceOf(EbyAbortError);
                }
            });
        });

        context('スラッシュコマンド', () => {
            function slashInput(commandName, commandArgs) {
                return commandInputBlueprint(
                    { argc: 1, argv: [commandName], args: commandArgs },
                    { type: 'interaction', content: commandName, commandArgs }
                );
            }

            specify('空白を含む値もそのまま1つの引数として扱う', async () => {
                const invoker = new CommandInvoker();
                const input = slashInput('teach', { from: 'Hello World', to: 'ハロー ワールド' });
                const response = await invoker.invoke(basicHanako(), input);
                response.type.should.equal('action');
                response.action.from.should.equal('Hello World');
                response.action.to.should.equal('ハロー ワールド');
            });

            specify('ユーザーはIDで受け取る', async () => {
                const invoker = new CommandInvoker();
                const input = slashInput('blacklist-add', { user: { id: 'bob-id', name: 'ボブ' } });
                const response = await invoker.invoke(basicHanako(), input);
                response.type.should.equal('action');
                response.action.userId.should.equal('bob-id');
            });

            specify('テキストのコマンド名と違うスラッシュコマンド名でも解決する', async () => {
                const invoker = new CommandInvoker();
                const input = slashInput('se-search', { keyword: 'ドン' });
                const response = await invoker.invoke(basicHanako(), input);
                response.type.should.equal('chat');
            });

            specify('未知のスラッシュコマンドはabortする', async () => {
                const invoker = new CommandInvoker();
                const input = slashInput('unknown-xyz', {});
                try {
                    await invoker.invoke(basicHanako(), input);
                    should.fail('should have rejected');
                } catch (e) {
                    e.should.be.instanceOf(EbyAbortError);
                }
            });
        });
    });
});

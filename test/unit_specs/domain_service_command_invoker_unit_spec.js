const should = require('chai').should();
const CommandInvoker = require('../../src/domain/service/command_invoker');
const EbyAbortError = require('../../src/core/errors/eby_abort_error');
const {
    basicHanako,
    commandInputBlueprint,
    silenceDictionaryLineBlueprint,
    wordDictionaryLineBlueprint,
    SilenceDictionary,
    WordDictionary,
} = require('../helpers/blueprints');

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
                const input = commandInputBlueprint(
                    { argc: 2, argv: ['limit', '100'] },
                    { memberPermissions: ['manageGuild'] }
                );
                const response = await invoker.invoke(hanako, input);
                response.type.should.equal('action');
            });
        });

        context('テキストコマンドを無効にしたサーバー', () => {
            const disabledHanako = () => basicHanako({ settings: { textCommands: false } });

            specify('既知のコマンドでも実行せず、案内も返さずに中断する', async () => {
                const invoker = new CommandInvoker();
                const input = commandInputBlueprint({ argc: 1, argv: ['ask'] });
                try {
                    await invoker.invoke(disabledHanako(), input);
                    should.fail('should have rejected');
                } catch (e) {
                    e.should.be.instanceOf(EbyAbortError);
                }
            });

            specify('スラッシュコマンドはこれまでどおり実行できる', async () => {
                const invoker = new CommandInvoker();
                const input = commandInputBlueprint(
                    { argc: 1, argv: ['ask'] },
                    { type: 'interaction', content: 'ask', commandArgs: {} }
                );
                const response = await invoker.invoke(disabledHanako(), input);
                response.type.should.equal('chat');
            });

            specify('既存のサーバー（設定がない）ではテキストコマンドを使える', async () => {
                const invoker = new CommandInvoker();
                const input = commandInputBlueprint({ argc: 1, argv: ['ask'] });
                const response = await invoker.invoke(basicHanako(), input);
                response.type.should.equal('chat');
            });

            specify('テキストコマンドの設定はテキストからは変えられない', async () => {
                const invoker = new CommandInvoker();
                const input = commandInputBlueprint(
                    { argc: 2, argv: ['text-commands', 'true'] },
                    { memberPermissions: ['manageGuild'] }
                );
                try {
                    await invoker.invoke(basicHanako(), input);
                    should.fail('should have rejected');
                } catch (e) {
                    e.should.be.instanceOf(EbyAbortError);
                }
            });
        });

        context('テキストで実行されたときの権限', () => {
            specify('必要な権限がないと実行せずに案内する', async () => {
                const invoker = new CommandInvoker();
                const input = commandInputBlueprint({ argc: 2, argv: ['limit', '100'] }, { memberPermissions: [] });
                const response = await invoker.invoke(basicHanako(), input);
                response.type.should.equal('chat');
                response.code.should.equal('error');
                response.content.should.have.string('サーバー管理');
            });

            specify('別の権限を持っていても、必要な権限がなければ実行しない', async () => {
                const invoker = new CommandInvoker();
                const input = commandInputBlueprint(
                    { argc: 2, argv: ['blacklist-add', '@bob'] },
                    { memberPermissions: ['manageGuild'], mentionedUsers: new Map([['bob', 'bob-id']]) }
                );
                const response = await invoker.invoke(basicHanako(), input);
                response.code.should.equal('error');
                response.content.should.have.string('メンバーをタイムアウト');
            });

            specify('必要な権限があれば実行する', async () => {
                const invoker = new CommandInvoker();
                const input = commandInputBlueprint(
                    { argc: 2, argv: ['blacklist-add', '@bob'] },
                    { memberPermissions: ['moderateMembers'], mentionedUsers: new Map([['bob', 'bob-id']]) }
                );
                const response = await invoker.invoke(basicHanako(), input);
                response.type.should.equal('action');
            });

            specify('権限の要らないコマンドは誰でも実行できる', async () => {
                const invoker = new CommandInvoker();
                const input = commandInputBlueprint(
                    { argc: 3, argv: ['teach', '花子', 'はなこ'] },
                    { memberPermissions: [] }
                );
                const response = await invoker.invoke(basicHanako(), input);
                response.type.should.equal('action');
            });

            specify('権限がなくても「>」+ 文章の読み上げ回避はこれまでどおり黙って中断する', async () => {
                const invoker = new CommandInvoker();
                const input = commandInputBlueprint({ argc: 1, argv: ['今日は眠い'] }, { memberPermissions: [] });
                try {
                    await invoker.invoke(basicHanako(), input);
                    should.fail('should have rejected');
                } catch (e) {
                    e.should.be.instanceOf(EbyAbortError);
                }
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

            specify('破壊的なコマンドは確認を返し、確定済みなら実行する', async () => {
                const invoker = new CommandInvoker();
                const hanako = basicHanako({
                    silenceDictionary: new SilenceDictionary({
                        id: 'sd',
                        serverId: 'mock-server-id',
                        lines: [silenceDictionaryLineBlueprint()],
                    }),
                });

                const confirm = await invoker.invoke(hanako, slashInput('blacklist-clear', {}));
                confirm.code.should.equal('force');
                confirm.content.should.have.string('「実行する」を押して');
                confirm.content.should.not.have.string('--force');

                const done = await invoker.invoke(hanako, slashInput('blacklist-clear', { force: true }));
                done.type.should.equal('action');
            });

            specify('辞書の全消去もスラッシュコマンドで実行できる', async () => {
                const invoker = new CommandInvoker();
                const hanako = basicHanako({
                    wordDictionary: new WordDictionary({
                        id: 'wd',
                        serverId: 'mock-server-id',
                        lines: [wordDictionaryLineBlueprint()],
                    }),
                });

                const done = await invoker.invoke(hanako, slashInput('dictionary-clear', { force: true }));
                done.type.should.equal('action');
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

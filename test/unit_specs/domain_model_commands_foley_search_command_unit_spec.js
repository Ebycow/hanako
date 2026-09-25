const should = require('chai').should();
const FoleySearchCommand = require('../../src/domain/model/commands/foley_search_command');
const {
    basicHanako,
    commandInputBlueprint,
    foleyDictionaryLineBlueprint,
    FoleyDictionary,
} = require('../helpers/blueprints');

/************************************************************************
 * FoleySearchCommandクラス単体スペック
 *
 * メソッド：#process
 * 期待動作：SE検索レスポンスの返却
 * 備考：文字列一致を優先し、一致しない場合は誤字を考慮して検索
 ***********************************************************************/

describe('FoleySearchCommand', () => {
    describe('Commandクラスメタスペック', () => {
        specify('typeは文字列を返す', () => {
            const sub = new FoleySearchCommand(basicHanako());
            sub.type.should.be.a('string');
        });

        specify('namesは静的に文字列の配列を返す', () => {
            FoleySearchCommand.names.should.be.an('array').that.is.not.empty;
            FoleySearchCommand.names.forEach((name) => name.should.be.a('string'));
        });

        specify('processメソッドを持つ', () => {
            const sub = new FoleySearchCommand(basicHanako());
            sub.process.should.be.a('function');
        });
    });

    describe('#process', () => {
        context('正常系', () => {
            specify('完全一致、前方一致、部分一致の順にサジェストを返す', () => {
                const lines = [
                    foleyDictionaryLineBlueprint({
                        id: 'fdl-1',
                        keyword: 'これはSPKチェック完了です',
                    }),
                    foleyDictionaryLineBlueprint({
                        id: 'fdl-2',
                        keyword: 'SPKチェック完了しました',
                    }),
                    foleyDictionaryLineBlueprint({
                        id: 'fdl-3',
                        keyword: 'SPKチェック完了',
                    }),
                ];
                const fd = new FoleyDictionary({
                    id: 'fd',
                    serverId: 'mock-server-id',
                    lines,
                });
                const input = commandInputBlueprint({
                    argc: 1,
                    argv: ['SPKチェック完了'],
                });
                const sub = new FoleySearchCommand(basicHanako({ foleyDictionary: fd }));
                const res = sub.process(input);

                res.type.should.equal('chat');
                res.code.should.equal('simple');
                res.content
                    .indexOf('SPKチェック完了')
                    .should.be.lessThan(res.content.indexOf('SPKチェック完了しました'));
                res.content
                    .indexOf('SPKチェック完了しました')
                    .should.be.lessThan(res.content.indexOf('これはSPKチェック完了です'));
            });

            specify('英字の大小を区別せず完全一致する', () => {
                const lines = [
                    foleyDictionaryLineBlueprint({
                        id: 'fdl-1',
                        keyword: 'SPKチェック完了',
                    }),
                    foleyDictionaryLineBlueprint({
                        id: 'fdl-2',
                        keyword: 'spkチェック完了しました',
                    }),
                ];
                const fd = new FoleyDictionary({
                    id: 'fd',
                    serverId: 'mock-server-id',
                    lines,
                });
                const input = commandInputBlueprint({
                    argc: 1,
                    argv: ['spkチェック完了'],
                });
                const sub = new FoleySearchCommand(basicHanako({ foleyDictionary: fd }));
                const res = sub.process(input);

                res.content
                    .indexOf('SPKチェック完了')
                    .should.be.lessThan(res.content.indexOf('spkチェック完了しました'));
            });

            specify('空白区切りの全単語を含むSEをサジェストする', () => {
                const lines = [
                    foleyDictionaryLineBlueprint({
                        id: 'fdl-1',
                        keyword: '確認済みSPKボイス',
                    }),
                    foleyDictionaryLineBlueprint({
                        id: 'fdl-2',
                        keyword: 'SPKだけのボイス',
                    }),
                ];
                const fd = new FoleyDictionary({
                    id: 'fd',
                    serverId: 'mock-server-id',
                    lines,
                });
                const input = commandInputBlueprint({
                    argc: 2,
                    argv: ['SPK', '確認済み'],
                });
                const sub = new FoleySearchCommand(basicHanako({ foleyDictionary: fd }));
                const res = sub.process(input);

                res.content.should.include('確認済みSPKボイス');
                res.content.should.not.include('SPKだけのボイス');
            });

            specify('文字列一致がなければ登録名の一部分との距離で誤字を補う', () => {
                const lines = [
                    foleyDictionaryLineBlueprint({
                        id: 'fdl-1',
                        keyword: 'SPKチェック完了しました',
                    }),
                    foleyDictionaryLineBlueprint({
                        id: 'fdl-2',
                        keyword: '処理が終わりました',
                    }),
                ];
                const fd = new FoleyDictionary({
                    id: 'fd',
                    serverId: 'mock-server-id',
                    lines,
                });
                const input = commandInputBlueprint({ argc: 1, argv: ['SPKチェク完了'] });
                const sub = new FoleySearchCommand(basicHanako({ foleyDictionary: fd }));
                const res = sub.process(input);

                res.content.should.include('SPKチェック完了しました');
                res.content.should.not.include('処理が終わりました');
            });

            specify('文字列一致があればあいまい一致の候補を混ぜない', () => {
                const lines = [
                    foleyDictionaryLineBlueprint({
                        id: 'fdl-1',
                        keyword: 'SPKチェック完了しました',
                    }),
                    foleyDictionaryLineBlueprint({
                        id: 'fdl-2',
                        keyword: 'SPKチェク完了',
                    }),
                ];
                const fd = new FoleyDictionary({
                    id: 'fd',
                    serverId: 'mock-server-id',
                    lines,
                });
                const input = commandInputBlueprint({
                    argc: 1,
                    argv: ['SPKチェック完了'],
                });
                const sub = new FoleySearchCommand(basicHanako({ foleyDictionary: fd }));
                const res = sub.process(input);

                res.content.should.include('SPKチェック完了しました');
                res.content.should.not.include('SPKチェク完了');
            });

            specify('最大5つまでサジェストする', () => {
                const lines = [];
                for (let i = 0; i < 10; i++) {
                    lines.push(
                        foleyDictionaryLineBlueprint({
                            id: `fdl-${i}`,
                            keyword: `SEあいう${i}`,
                        })
                    );
                }
                const fd = new FoleyDictionary({
                    id: 'fd',
                    serverId: 'mock-server-id',
                    lines,
                });
                const input = commandInputBlueprint({ argc: 1, argv: ['SE'] });
                const sub = new FoleySearchCommand(basicHanako({ foleyDictionary: fd }));
                const res = sub.process(input);

                res.type.should.equal('chat');
                // contentにはスペース区切りで最大5つのキーワードが含まれる
                const keywords = res.content.split(': ')[1].split(' ');
                keywords.length.should.be.at.most(5);
            });

            specify('近くないSEはサジェストしない', () => {
                const lines = [foleyDictionaryLineBlueprint({ id: 'fdl-1', keyword: 'タピオカ' })];
                const fd = new FoleyDictionary({
                    id: 'fd',
                    serverId: 'mock-server-id',
                    lines,
                });
                const input = commandInputBlueprint({
                    argc: 1,
                    argv: ['まったく違う検索'],
                });
                const sub = new FoleySearchCommand(basicHanako({ foleyDictionary: fd }));
                const res = sub.process(input);

                res.content.should.equal('近いSEは見つからなかったよ :sob:');
            });
        });

        context('異常系', () => {
            specify('引数なしはエラー', () => {
                const input = commandInputBlueprint({ argc: 0, argv: [] });
                const sub = new FoleySearchCommand(basicHanako());
                const res = sub.process(input);

                res.type.should.equal('chat');
                res.code.should.equal('error');
            });

            specify('SE辞書が空ならエラー', () => {
                const input = commandInputBlueprint({ argc: 1, argv: ['タピオカ'] });
                const sub = new FoleySearchCommand(basicHanako());
                const res = sub.process(input);

                res.type.should.equal('chat');
                res.code.should.equal('error');
            });
        });
    });
});

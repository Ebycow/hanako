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
 * 備考：レーベンシュタイン距離で類似検索
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
            specify('レーベンシュタイン距離で近い順にサジェストを返す', () => {
                const lines = [
                    foleyDictionaryLineBlueprint({ id: 'fdl-1', keyword: 'タピオカ' }),
                    foleyDictionaryLineBlueprint({ id: 'fdl-2', keyword: 'タピオカウメス' }),
                    foleyDictionaryLineBlueprint({ id: 'fdl-3', keyword: 'ドンッあ' }),
                ];
                const fd = new FoleyDictionary({ id: 'fd', serverId: 'mock-server-id', lines });
                const input = commandInputBlueprint({ argc: 1, argv: ['タピオカ'] });
                const sub = new FoleySearchCommand(basicHanako({ foleyDictionary: fd }));
                const res = sub.process(input);

                res.type.should.equal('chat');
                res.code.should.equal('simple');
                res.content.should.include('タピオカ');
            });

            specify('最大5つまでサジェストする', () => {
                const lines = [];
                for (let i = 0; i < 10; i++) {
                    lines.push(foleyDictionaryLineBlueprint({ id: `fdl-${i}`, keyword: `SE${i}あいう` }));
                }
                const fd = new FoleyDictionary({ id: 'fd', serverId: 'mock-server-id', lines });
                const input = commandInputBlueprint({ argc: 1, argv: ['SE0'] });
                const sub = new FoleySearchCommand(basicHanako({ foleyDictionary: fd }));
                const res = sub.process(input);

                res.type.should.equal('chat');
                // contentにはスペース区切りで最大5つのキーワードが含まれる
                const keywords = res.content.split(': ')[1].split(' ');
                keywords.length.should.be.at.most(5);
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

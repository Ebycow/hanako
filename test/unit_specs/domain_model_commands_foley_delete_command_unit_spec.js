const should = require('chai').should();
const FoleyDeleteCommand = require('../../src/domain/model/commands/foley_delete_command');
const {
    basicHanako,
    commandInputBlueprint,
    foleyDictionaryLineBlueprint,
    FoleyDictionary,
} = require('../helpers/blueprints');

/************************************************************************
 * FoleyDeleteCommandクラス単体スペック
 *
 * メソッド：#process
 * 期待動作：SE削除アクションレスポンスの返却
 * 備考：単一/複数削除の2モードがある
 ***********************************************************************/

describe('FoleyDeleteCommand', () => {
    describe('Commandクラスメタスペック', () => {
        specify('typeは文字列を返す', () => {
            const sub = new FoleyDeleteCommand(basicHanako());
            sub.type.should.be.a('string');
        });

        specify('namesは静的に文字列の配列を返す', () => {
            FoleyDeleteCommand.names.should.be.an('array').that.is.not.empty;
            FoleyDeleteCommand.names.forEach((name) => name.should.be.a('string'));
        });

        specify('processメソッドを持つ', () => {
            const sub = new FoleyDeleteCommand(basicHanako());
            sub.process.should.be.a('function');
        });
    });

    describe('#process', () => {
        context('正常系 - 単一削除', () => {
            specify('存在するSEを削除するアクションレスポンスを返す', () => {
                const line = foleyDictionaryLineBlueprint({ keyword: 'ドンッ' });
                const fd = new FoleyDictionary({ id: 'fd', serverId: 'mock-server-id', lines: [line] });
                const input = commandInputBlueprint({ argc: 1, argv: ['ドンッ'] });
                const sub = new FoleyDeleteCommand(basicHanako({ foleyDictionary: fd }));
                const res = sub.process(input);

                res.type.should.equal('action');
                res.action.type.should.equal('foley_delete');
                res.onSuccess.content.should.include('ドンッ');
            });
        });

        context('正常系 - 複数削除', () => {
            specify('複数のSEを削除するアクションレスポンスを返す', () => {
                const line1 = foleyDictionaryLineBlueprint({ id: 'fdl-1', keyword: 'ドンッ' });
                const line2 = foleyDictionaryLineBlueprint({ id: 'fdl-2', keyword: 'バシッ' });
                const fd = new FoleyDictionary({ id: 'fd', serverId: 'mock-server-id', lines: [line1, line2] });
                const input = commandInputBlueprint({ argc: 2, argv: ['ドンッ', 'バシッ'] });
                const sub = new FoleyDeleteCommand(basicHanako({ foleyDictionary: fd }));
                const res = sub.process(input);

                res.type.should.equal('action');
                res.action.type.should.equal('foley_delete_multiple');
                res.onSuccess.content.should.include('2個');
            });

            specify('一部のSEが見つからない場合も見つかったものは削除する', () => {
                const line = foleyDictionaryLineBlueprint({ keyword: 'ドンッ' });
                const fd = new FoleyDictionary({ id: 'fd', serverId: 'mock-server-id', lines: [line] });
                const input = commandInputBlueprint({ argc: 2, argv: ['ドンッ', '存在しない'] });
                const sub = new FoleyDeleteCommand(basicHanako({ foleyDictionary: fd }));
                const res = sub.process(input);

                res.type.should.equal('action');
                res.onSuccess.content.should.include('ドンッ');
                res.onSuccess.content.should.include('見つからなかった');
            });
        });

        context('異常系', () => {
            specify('引数なしはエラー', () => {
                const input = commandInputBlueprint({ argc: 0, argv: [] });
                const sub = new FoleyDeleteCommand(basicHanako());
                const res = sub.process(input);

                res.type.should.equal('chat');
                res.code.should.equal('error');
            });

            specify('単一削除で存在しないSEはエラー', () => {
                const input = commandInputBlueprint({ argc: 1, argv: ['存在しない'] });
                const sub = new FoleyDeleteCommand(basicHanako());
                const res = sub.process(input);

                res.type.should.equal('chat');
                res.code.should.equal('error');
            });

            specify('複数削除で全て見つからない場合はエラー', () => {
                const input = commandInputBlueprint({ argc: 2, argv: ['無い1', '無い2'] });
                const sub = new FoleyDeleteCommand(basicHanako());
                const res = sub.process(input);

                res.type.should.equal('chat');
                res.code.should.equal('error');
            });
        });
    });
});

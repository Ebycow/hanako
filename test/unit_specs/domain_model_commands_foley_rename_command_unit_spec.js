const should = require('chai').should();
const FoleyRenameCommand = require('../../src/domain/model/commands/foley_rename_command');
const {
    basicHanako,
    commandInputBlueprint,
    foleyDictionaryLineBlueprint,
    FoleyDictionary,
} = require('../helpers/blueprints');

/************************************************************************
 * FoleyRenameCommandクラス単体スペック
 *
 * メソッド：#process
 * 期待動作：SE名置換アクションレスポンスの返却
 * 備考：なし
 ***********************************************************************/

describe('FoleyRenameCommand', () => {
    describe('Commandクラスメタスペック', () => {
        specify('typeは文字列を返す', () => {
            const sub = new FoleyRenameCommand(basicHanako());
            sub.type.should.be.a('string');
        });

        specify('namesは静的に文字列の配列を返す', () => {
            FoleyRenameCommand.names.should.be.an('array').that.is.not.empty;
            FoleyRenameCommand.names.forEach((name) => name.should.be.a('string'));
        });

        specify('processメソッドを持つ', () => {
            const sub = new FoleyRenameCommand(basicHanako());
            sub.process.should.be.a('function');
        });
    });

    describe('#process', () => {
        context('正常系', () => {
            specify('正しいSE名置換アクションレスポンスを返す', () => {
                const line = foleyDictionaryLineBlueprint({ keyword: 'ドンッ' });
                const fd = new FoleyDictionary({ id: 'fd', serverId: 'mock-server-id', lines: [line] });
                const input = commandInputBlueprint({ argc: 2, argv: ['ドンッ', 'ドカン'] });
                const sub = new FoleyRenameCommand(basicHanako({ foleyDictionary: fd }));
                const res = sub.process(input);

                res.type.should.equal('action');
                res.action.type.should.equal('foley_rename');
                res.onSuccess.content.should.include('ドンッ');
                res.onSuccess.content.should.include('ドカン');
            });
        });

        context('異常系', () => {
            specify('引数が2つでないとエラー', () => {
                const input = commandInputBlueprint({ argc: 1, argv: ['ドンッ'] });
                const sub = new FoleyRenameCommand(basicHanako());
                const res = sub.process(input);

                res.type.should.equal('chat');
                res.code.should.equal('error');
            });

            specify('変更元が存在しないとエラー', () => {
                const input = commandInputBlueprint({ argc: 2, argv: ['存在しない', 'ドカン'] });
                const sub = new FoleyRenameCommand(basicHanako());
                const res = sub.process(input);

                res.type.should.equal('chat');
                res.code.should.equal('error');
            });

            specify('変更先が既に存在するとエラー', () => {
                const line1 = foleyDictionaryLineBlueprint({ id: 'fdl-1', keyword: 'ドンッ' });
                const line2 = foleyDictionaryLineBlueprint({ id: 'fdl-2', keyword: 'ドカン' });
                const fd = new FoleyDictionary({ id: 'fd', serverId: 'mock-server-id', lines: [line1, line2] });
                const input = commandInputBlueprint({ argc: 2, argv: ['ドンッ', 'ドカン'] });
                const sub = new FoleyRenameCommand(basicHanako({ foleyDictionary: fd }));
                const res = sub.process(input);

                res.type.should.equal('chat');
                res.code.should.equal('error');
            });

            specify('変更先が1文字だとエラー', () => {
                const line = foleyDictionaryLineBlueprint({ keyword: 'ドンッ' });
                const fd = new FoleyDictionary({ id: 'fd', serverId: 'mock-server-id', lines: [line] });
                const input = commandInputBlueprint({ argc: 2, argv: ['ドンッ', 'あ'] });
                const sub = new FoleyRenameCommand(basicHanako({ foleyDictionary: fd }));
                const res = sub.process(input);

                res.type.should.equal('chat');
                res.code.should.equal('error');
            });

            specify('変更先が50文字以上だとエラー', () => {
                const line = foleyDictionaryLineBlueprint({ keyword: 'ドンッ' });
                const fd = new FoleyDictionary({ id: 'fd', serverId: 'mock-server-id', lines: [line] });
                const longStr = 'あ'.repeat(50);
                const input = commandInputBlueprint({ argc: 2, argv: ['ドンッ', longStr] });
                const sub = new FoleyRenameCommand(basicHanako({ foleyDictionary: fd }));
                const res = sub.process(input);

                res.type.should.equal('chat');
                res.code.should.equal('error');
            });
        });
    });
});

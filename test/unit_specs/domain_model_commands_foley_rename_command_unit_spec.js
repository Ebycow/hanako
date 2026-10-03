const should = require('chai').should();
const FoleyRenameCommand = require('../../src/domain/model/commands/foley_rename_command');
const {
    basicHanako,
    commandInputBlueprint,
    foleyDictionaryLineBlueprint,
    FoleyDictionary,
    processText,
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
                const res = processText(sub, input);

                res.type.should.equal('action');
                res.action.type.should.equal('foley_rename');
                res.onSuccess.content.should.include('ドンッ');
                res.onSuccess.content.should.include('ドカン');
            });

            specify('半角カナのSE名を全角に直す変更はできる', () => {
                const line = foleyDictionaryLineBlueprint({ keyword: 'ﾄﾞﾝｯ' });
                const fd = new FoleyDictionary({ id: 'fd', serverId: 'mock-server-id', lines: [line] });
                const input = commandInputBlueprint({ argc: 2, argv: ['ﾄﾞﾝｯ', 'ドンッ'] });
                const sub = new FoleyRenameCommand(basicHanako({ foleyDictionary: fd }));
                const res = processText(sub, input);

                res.type.should.equal('action');
            });
        });

        context('異常系', () => {
            specify('引数が2つでないとエラー', () => {
                const input = commandInputBlueprint({ argc: 1, argv: ['ドンッ'] });
                const sub = new FoleyRenameCommand(basicHanako());
                const res = processText(sub, input);

                res.type.should.equal('chat');
                res.code.should.equal('error');
            });

            specify('変更元が存在しないとエラー', () => {
                const input = commandInputBlueprint({ argc: 2, argv: ['存在しない', 'ドカン'] });
                const sub = new FoleyRenameCommand(basicHanako());
                const res = processText(sub, input);

                res.type.should.equal('chat');
                res.code.should.equal('error');
            });

            specify('変更先が既に存在するとエラー', () => {
                const line1 = foleyDictionaryLineBlueprint({ id: 'fdl-1', keyword: 'ドンッ' });
                const line2 = foleyDictionaryLineBlueprint({ id: 'fdl-2', keyword: 'ドカン' });
                const fd = new FoleyDictionary({ id: 'fd', serverId: 'mock-server-id', lines: [line1, line2] });
                const input = commandInputBlueprint({ argc: 2, argv: ['ドンッ', 'ドカン'] });
                const sub = new FoleyRenameCommand(basicHanako({ foleyDictionary: fd }));
                const res = processText(sub, input);

                res.type.should.equal('chat');
                res.code.should.equal('error');
            });

            specify('変更先が文字種をそろえると既存のSE名と同じになるとエラー', () => {
                const line1 = foleyDictionaryLineBlueprint({ id: 'fdl-1', keyword: 'ドンッ' });
                const line2 = foleyDictionaryLineBlueprint({ id: 'fdl-2', keyword: 'ドカン' });
                const fd = new FoleyDictionary({ id: 'fd', serverId: 'mock-server-id', lines: [line1, line2] });
                const input = commandInputBlueprint({ argc: 2, argv: ['ドンッ', 'ﾄﾞｶﾝ'] });
                const sub = new FoleyRenameCommand(basicHanako({ foleyDictionary: fd }));
                const res = processText(sub, input);

                res.type.should.equal('chat');
                res.code.should.equal('error');
            });

            specify('変更先が1文字だとエラー', () => {
                const line = foleyDictionaryLineBlueprint({ keyword: 'ドンッ' });
                const fd = new FoleyDictionary({ id: 'fd', serverId: 'mock-server-id', lines: [line] });
                const input = commandInputBlueprint({ argc: 2, argv: ['ドンッ', 'あ'] });
                const sub = new FoleyRenameCommand(basicHanako({ foleyDictionary: fd }));
                const res = processText(sub, input);

                res.type.should.equal('chat');
                res.code.should.equal('error');
            });

            specify('変更先が50文字なら変更できる', () => {
                const line = foleyDictionaryLineBlueprint({ keyword: 'ドンッ' });
                const fd = new FoleyDictionary({ id: 'fd', serverId: 'mock-server-id', lines: [line] });
                const input = commandInputBlueprint({ argc: 2, argv: ['ドンッ', 'あ'.repeat(50)] });
                const sub = new FoleyRenameCommand(basicHanako({ foleyDictionary: fd }));
                const res = processText(sub, input);

                res.type.should.equal('action');
            });

            specify('変更先が51文字以上だとエラー', () => {
                const line = foleyDictionaryLineBlueprint({ keyword: 'ドンッ' });
                const fd = new FoleyDictionary({ id: 'fd', serverId: 'mock-server-id', lines: [line] });
                const longStr = 'あ'.repeat(51);
                const input = commandInputBlueprint({ argc: 2, argv: ['ドンッ', longStr] });
                const sub = new FoleyRenameCommand(basicHanako({ foleyDictionary: fd }));
                const res = processText(sub, input);

                res.type.should.equal('chat');
                res.code.should.equal('error');
            });
        });
    });
});

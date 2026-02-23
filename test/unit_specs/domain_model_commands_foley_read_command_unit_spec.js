const should = require('chai').should();
const FoleyReadCommand = require('../../src/domain/model/commands/foley_read_command');
const {
    basicHanako,
    commandInputBlueprint,
    foleyDictionaryLineBlueprint,
    FoleyDictionary,
} = require('../helpers/blueprints');

/************************************************************************
 * FoleyReadCommandクラス単体スペック
 *
 * メソッド：#process
 * 期待動作：SE一覧ページャーレスポンスの返却
 * 備考：なし
 ***********************************************************************/

describe('FoleyReadCommand', () => {
    describe('Commandクラスメタスペック', () => {
        specify('typeは文字列を返す', () => {
            const sub = new FoleyReadCommand(basicHanako());
            sub.type.should.be.a('string');
        });

        specify('namesは静的に文字列の配列を返す', () => {
            FoleyReadCommand.names.should.be.an('array').that.is.not.empty;
            FoleyReadCommand.names.forEach((name) => name.should.be.a('string'));
        });

        specify('processメソッドを持つ', () => {
            const sub = new FoleyReadCommand(basicHanako());
            sub.process.should.be.a('function');
        });
    });

    describe('#process', () => {
        context('正常系', () => {
            specify('SEが登録されていればページャーレスポンスを返す', () => {
                const line = foleyDictionaryLineBlueprint({ keyword: 'ドンッ' });
                const fd = new FoleyDictionary({ id: 'fd', serverId: 'mock-server-id', lines: [line] });
                const input = commandInputBlueprint();
                const sub = new FoleyReadCommand(basicHanako({ foleyDictionary: fd }));
                const res = sub.process(input);

                res.type.should.equal('chat');
                res.code.should.equal('pager');
            });
        });

        context('異常系', () => {
            specify('SE辞書が空ならエラーレスポンスを返す', () => {
                const input = commandInputBlueprint();
                const sub = new FoleyReadCommand(basicHanako());
                const res = sub.process(input);

                res.type.should.equal('chat');
                res.code.should.equal('error');
            });
        });
    });
});

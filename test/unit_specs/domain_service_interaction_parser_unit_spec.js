require('chai').should();
const InteractionParser = require('../../src/domain/service/interaction_parser');
const { basicHanako, dmessageBlueprint } = require('../helpers/blueprints');

/************************************************************************
 * InteractionParserクラス単体スペック
 *
 * メソッド：#parse
 * 期待動作：スラッシュコマンドのメッセージをコマンド引数に変換する
 * 備考：引数は文字列に戻さず、名前付きの引数のまま渡す
 ***********************************************************************/

describe('InteractionParser', () => {
    describe('#parse', () => {
        specify('argvはスラッシュコマンド名だけで、名前付きの引数をそのまま持つ', async () => {
            const parser = new InteractionParser();
            const dm = dmessageBlueprint({
                type: 'interaction',
                content: 'teach',
                commandArgs: { from: 'Hello World', to: 'ハロワ' },
            });
            const input = await parser.parse(basicHanako(), dm);
            input.argv.should.deep.equal(['teach']);
            input.args.should.deep.equal({ from: 'Hello World', to: 'ハロワ' });
            input.source.should.equal('slash');
        });

        specify('idがdmessageのidと一致する', async () => {
            const parser = new InteractionParser();
            const dm = dmessageBlueprint({ id: 'interaction-001', type: 'interaction', content: 'help' });
            const input = await parser.parse(basicHanako(), dm);
            input.id.should.equal('interaction-001');
            input.args.should.deep.equal({});
        });
    });
});

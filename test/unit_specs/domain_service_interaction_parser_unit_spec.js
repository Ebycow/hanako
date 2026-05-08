const should = require('chai').should();
const InteractionParser = require('../../src/domain/service/interaction_parser');
const EbyAbortError = require('../../src/core/errors/eby_abort_error');
const { basicHanako, dmessageBlueprint } = require('../helpers/blueprints');

/************************************************************************
 * InteractionParserクラス単体スペック
 *
 * メソッド：#parse
 * 期待動作：Discordインタラクションをパースしてコマンド引数に変換する
 * 備考：CommandParserとほぼ同一ロジックだがtype='interaction'を受け付ける
 ***********************************************************************/

describe('InteractionParser', () => {
    describe('#parse', () => {
        context('正常系', () => {
            specify('プリフィクス形式のインタラクションをパースする', async () => {
                const parser = new InteractionParser();
                const hanako = basicHanako();
                const dm = dmessageBlueprint({ type: 'interaction', content: '>ask 質問' });
                const input = await parser.parse(hanako, dm);
                input.argc.should.equal(2);
                input.argv[0].should.equal('ask');
                input.argv[1].should.equal('質問');
            });

            specify('@メンション形式のインタラクションをパースする', async () => {
                const parser = new InteractionParser();
                const hanako = basicHanako();
                const dm = dmessageBlueprint({ type: 'interaction', content: '@hanako help' });
                const input = await parser.parse(hanako, dm);
                input.argc.should.equal(1);
                input.argv[0].should.equal('help');
            });

            specify('idがdmessageのidと一致する', async () => {
                const parser = new InteractionParser();
                const hanako = basicHanako();
                const dm = dmessageBlueprint({ type: 'interaction', content: '>help' });
                const input = await parser.parse(hanako, dm);
                input.id.should.equal(dm.id);
            });
        });

        context('異常系', () => {
            specify('プリフィクスでも@でもない形式はabortする', async () => {
                const parser = new InteractionParser();
                const hanako = basicHanako();
                const dm = dmessageBlueprint({ type: 'interaction', content: 'ask 質問' });
                try {
                    await parser.parse(hanako, dm);
                    should.fail('should have rejected');
                } catch (e) {
                    e.should.be.instanceOf(EbyAbortError);
                }
            });
        });
    });
});

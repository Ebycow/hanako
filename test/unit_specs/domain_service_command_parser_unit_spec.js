const should = require('chai').should();
const CommandParser = require('../../src/domain/service/command_parser');
const EbyAbortError = require('../../src/core/errors/eby_abort_error');
const { basicHanako, dmessageBlueprint } = require('../helpers/blueprints');

/************************************************************************
 * CommandParserクラス単体スペック
 *
 * メソッド：#parse
 * 期待動作：Discordメッセージをパースしてコマンド引数に変換する
 * 備考：@メンション形式とプリフィクス形式の両方をサポート
 ***********************************************************************/

describe('CommandParser', () => {
    describe('#parse', () => {
        context('正常系', () => {
            specify('プリフィクス形式のコマンドをパースする', async () => {
                const parser = new CommandParser();
                const hanako = basicHanako();
                const dm = dmessageBlueprint({ type: 'command', content: '>ask 質問' });
                const input = await parser.parse(hanako, dm);
                input.argc.should.equal(2);
                input.argv[0].should.equal('ask');
                input.argv[1].should.equal('質問');
            });

            specify('@メンション形式のコマンドをパースする', async () => {
                const parser = new CommandParser();
                const hanako = basicHanako();
                const dm = dmessageBlueprint({ type: 'command', content: '@hanako ask' });
                const input = await parser.parse(hanako, dm);
                input.argc.should.equal(1);
                input.argv[0].should.equal('ask');
            });

            specify('全角スペースで区切られたコマンドをパースする', async () => {
                const parser = new CommandParser();
                const hanako = basicHanako();
                const dm = dmessageBlueprint({ type: 'command', content: '>ask\u3000質問' });
                const input = await parser.parse(hanako, dm);
                input.argc.should.equal(2);
                input.argv[0].should.equal('ask');
            });

            specify('idがdmessageのidと一致する', async () => {
                const parser = new CommandParser();
                const hanako = basicHanako();
                const dm = dmessageBlueprint({ type: 'command', content: '>help' });
                const input = await parser.parse(hanako, dm);
                input.id.should.equal(dm.id);
            });
        });

        context('異常系', () => {
            specify('プリフィクスでも@でもない形式はabortする', async () => {
                const parser = new CommandParser();
                const hanako = basicHanako();
                const dm = dmessageBlueprint({ type: 'command', content: 'ask 質問' });
                try {
                    await parser.parse(hanako, dm);
                    should.fail('should have rejected');
                } catch (e) {
                    e.should.be.instanceOf(EbyAbortError);
                }
            });

            specify('空白のみの引数がある場合はabortする', async () => {
                const parser = new CommandParser();
                const hanako = basicHanako();
                // ">" + "  ask" → parts[0]が空になる
                const dm = dmessageBlueprint({ type: 'command', content: '>  ask' });
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

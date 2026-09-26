require('chai').should();
const commands = require('../../src/domain/model/commands');
const { toSlashCommandJSON, buildSlashCommandsJSON } = require('../../src/service/slash_command_builder');

/************************************************************************
 * slash_command_builder単体スペック
 *
 * 期待動作：コマンドクラスのスラッシュ定義をDiscordに登録するJSONに変換する
 * 備考：なし
 ***********************************************************************/

describe('slash_command_builder', () => {
    describe('#toSlashCommandJSON', () => {
        specify('オプションの型・必須・範囲を変換する', () => {
            const json = toSlashCommandJSON({
                name: 'test',
                description: 'テスト',
                options: [
                    { type: 'integer', name: 'n', description: '数', required: true, minValue: 0, maxValue: 10 },
                    { type: 'attachment', name: 'file', description: 'ファイル', required: false },
                ],
            });
            json.name.should.equal('test');
            json.options[0].should.include({ type: 4, name: 'n', required: true, min_value: 0, max_value: 10 });
            json.options[1].should.include({ type: 11, name: 'file', required: false });
        });
    });

    describe('#buildSlashCommandsJSON', () => {
        specify('スラッシュ定義を持つコマンドをすべて変換する', () => {
            const expected = Object.values(commands).filter((K) => K.slash).length;
            buildSlashCommandsJSON().should.have.lengthOf(expected);
        });

        specify('スラッシュコマンド名は重複しない', () => {
            const names = buildSlashCommandsJSON().map((json) => json.name);
            new Set(names).size.should.equal(names.length);
        });
    });
});

const should = require('chai').should();
const { PermissionFlagsBits } = require('discord.js');
const commands = require('../../src/domain/model/commands');
const {
    toSlashCommandJSON,
    buildSlashCommandsJSON,
    summarizeSlashCommands,
} = require('../../src/service/slash_command_builder');

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

        specify('必要な権限を使える人の初期値にする', () => {
            const byName = Object.fromEntries(buildSlashCommandsJSON().map((json) => [json.name, json]));
            const manageGuild = String(PermissionFlagsBits.ManageGuild);
            const moderateMembers = String(PermissionFlagsBits.ModerateMembers);

            ['limit', 'dictionary-clear', 'blacklist-clear'].forEach((name) =>
                byName[name].default_member_permissions.should.equal(manageGuild)
            );
            ['blacklist-add', 'blacklist-remove', 'blacklist-show'].forEach((name) =>
                byName[name].default_member_permissions.should.equal(moderateMembers)
            );
            ['ask', 'plz', 'teach', 'se-add', 'se-normalize', 'speaker'].forEach((name) =>
                should.not.exist(byName[name].default_member_permissions)
            );
        });

        specify('スラッシュコマンド名は重複しない', () => {
            const names = buildSlashCommandsJSON().map((json) => json.name);
            new Set(names).size.should.equal(names.length);
        });
    });

    describe('#summarizeSlashCommands', () => {
        specify('使える人・返信の公開範囲・省略可能なオプションを表にする', () => {
            const byName = Object.fromEntries(summarizeSlashCommands().map((row) => [row['コマンド'], row]));
            byName['/limit']['使える人の初期値'].should.equal('サーバー管理');
            byName['/teach']['使える人の初期値'].should.equal('全員');
            byName['/dictionary']['返信'].should.equal('本人のみ');
            byName['/se-add']['オプション'].should.equal('keyword url? file?');
        });
    });
});

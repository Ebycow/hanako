require('chai').should();
const TextCommandsCommand = require('../../src/domain/model/commands/text_commands_command');
const Settings = require('../../src/domain/entity/settings');
const { basicHanako, commandInputBlueprint, settingsBlueprint } = require('../helpers/blueprints');

/************************************************************************
 * TextCommandsCommandクラス単体スペック
 *
 * メソッド：#process
 * 期待動作：テキストコマンドの有効・無効の更新アクションレスポンスの返却
 * 備考：スラッシュコマンドでだけ実行できる
 ***********************************************************************/

describe('TextCommandsCommand', () => {
    describe('Commandクラスメタスペック', () => {
        specify('テキストのコマンド名を持たない（テキストからは切り替えられない）', () => {
            TextCommandsCommand.names.should.deep.equal([]);
        });

        specify('サーバー管理の権限が必要', () => {
            TextCommandsCommand.requiredPermission.should.equal('manageGuild');
        });
    });

    describe('#process', () => {
        specify('無効にするアクションレスポンスを返す', () => {
            const input = commandInputBlueprint().withArgs({ enabled: false });
            const res = new TextCommandsCommand(basicHanako()).process(input);
            res.type.should.equal('action');
            res.action.type.should.equal('text_commands_update');
            res.action.enabled.should.equal(false);
            res.onSuccess.content.should.have.string('使えないように');
        });

        specify('有効にするアクションレスポンスを返す', () => {
            const input = commandInputBlueprint().withArgs({ enabled: true });
            const res = new TextCommandsCommand(basicHanako()).process(input);
            res.action.enabled.should.equal(true);
        });
    });

    describe('Settings#textCommands', () => {
        specify('設定がなければ使える（既存サーバーの挙動を変えない）', () => {
            new Settings(settingsBlueprint()).textCommands.should.equal(true);
        });

        specify('無効にした設定を読める', () => {
            new Settings(settingsBlueprint({ textCommands: false })).textCommands.should.equal(false);
        });
    });
});

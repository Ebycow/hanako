const should = require('chai').should();
const FoleyCreate = require('../../src/domain/model/commands/foley_create_command');
const DiscordMessage = require('../../src/domain/entity/discord_message');
const CommandInput = require('../../src/domain/entity/command_input');
const Settings = require('../../src/domain/entity/settings');
const ServerStatus = require('../../src/domain/entity/server_status');
const FoleyDictionary = require('../../src/domain/entity/foley_dictionary');
const Hanako = require('../../src/domain/model/hanako');

/************************************************************************
 * FoleyCreateCommandクラス単体スペック
 *
 * メソッド：#process
 * 期待動作：SE追加アクションレスポンスの返却
 * 前提条件：入力の文字数が２より大きいこと
 *          ∧ 文字数が５０以下であること
 *          ∧ 出力音声に対応するリソース文字列のコードポイント数が３００以内のこと
 *          ∧ 出力音声に対応するリソース文字列が一般的なURL形式を満たしているか
 *          ∧ 既に当該キーワードが登録されていない
 *          ∧ 既に上限数（１００登録）をこえてしまっていない
 * 備考：なし
 ***********************************************************************/

describe('FoleyCreateCommand', () => {
    // helper
    function settingsBlueprint() {
        return {
            id: 'mock-settings-id',
            serverId: 'mock-server-id',
            maxCount: 0,
            speaker: 'default',
        };
    }

    // helper
    function serverStatusBlueprint() {
        return {
            id: 'mock-status-id',
            serverId: 'mock-server-id',
            serverName: 'mock-server-name',
            userId: 'mock-user-id',
            prefix: 'mock-prefix',
        };
    }

    describe('Commandクラスメタスペック', () => {
        specify('typeは文字列を返す', () => {
            const sub = new FoleyCreate();
            sub.type.should.be.a('string');
        });

        specify('namesは静的に文字列の配列を返す', () => {
            FoleyCreate.names.should.be.an('array').that.is.not.empty;
            FoleyCreate.names.forEach(name => name.should.be.a('string'));
        });

        specify('processメソッドを持つ', () => {
            const sub = new FoleyCreate();
            sub.process.should.be.a('function');
        });
    });

    describe('#process', () => {
        context('正常系', () => {
            specify('正しいSE追加アクションレスポンスを返す', () => {
                const mockEntityId = 'mock-001';
                const mockTextChannelId = 'mock-text-001';
                const mockDiscirdServerId = 'mock-discord-server-001';

                const dmessage = new DiscordMessage({
                    id: mockEntityId,
                    content: 'dummy',
                    type: 'command',
                    serverId: mockDiscirdServerId,
                    channelId: mockTextChannelId,
                    userId: 'dummy-user-id',
                    voiceChannelId: null,
                    mentionedUsers: new Map(),
                });
                const input = new CommandInput({
                    id: mockEntityId,
                    argc: 2,
                    argv: ['hello', 'http://hello:123/some.mp3'],
                    origin: dmessage,
                });

                const stb = settingsBlueprint();
                const ssb = serverStatusBlueprint();
                const theEmptyDict = new FoleyDictionary({ id: 'dummg', serverId: 'dummy', lines: [] });
                const hanako = new Hanako(new Settings(stb), new ServerStatus(ssb), null, null, null, theEmptyDict);

                const sub = new FoleyCreate(hanako);
                const res = sub.process(input);

                // 正しいアクションレスポンス
                res.type.should.equal('action');
                res.id.should.equal(mockEntityId);
                res.action.type.should.equal('foley_create');
                res.action.serverId.should.equal(mockDiscirdServerId);
                res.onSuccess.code.should.equal('simple');
                res.onFailure.code.should.equal('error');
            });
        });
    });
});

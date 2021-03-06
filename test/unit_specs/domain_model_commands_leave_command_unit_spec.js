const should = require('chai').should();
const LeaveCommand = require('../../src/domain/model/commands/leave_command');
const DiscordMessage = require('../../src/domain/entity/discord_message');
const CommandInput = require('../../src/domain/entity/command_input');
const Settings = require('../../src/domain/entity/settings');
const ServerStatus = require('../../src/domain/entity/server_status');
const VoiceStatus = require('../../src/domain/entity/voice_status');
const Hanako = require('../../src/domain/model/hanako');

/************************************************************************
 * LeaveCommandクラス単体スペック
 *
 * メソッド：#process
 * 期待動作：VC退出アクションレスポンスの返却
 * 前提条件：花子VC参加済み
 * 備考：なし
 ***********************************************************************/

describe('LeaveCommand', () => {
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

    // helper
    function voiceStatusBlueprint() {
        return {
            id: 'mock-status-id',
            serverId: 'mock-server-id',
            state: 'ready',
            voiceChannelId: 'mock-voice-channel-id',
            readingChannelsId: ['mock-reading-channel-id'],
        };
    }

    // helper
    function basicHanako() {
        return new Hanako(
            new Settings(settingsBlueprint()),
            new ServerStatus(serverStatusBlueprint()),
            new VoiceStatus(voiceStatusBlueprint()),
            null,
            null,
            null
        );
    }

    describe('Commandクラスメタスペック', () => {
        specify('typeは文字列を返す', () => {
            const sub = new LeaveCommand(basicHanako());
            sub.type.should.be.a('string');
        });

        specify('namesは静的に文字列の配列を返す', () => {
            LeaveCommand.names.should.be.an('array').that.is.not.empty;
            LeaveCommand.names.forEach(name => name.should.be.a('string'));
        });

        specify('processメソッドを持つ', () => {
            const sub = new LeaveCommand(basicHanako());
            sub.process.should.be.a('function');
        });
    });

    describe('#process', () => {
        context('正常系', () => {
            specify('正しいVC退出アクションレスポンスを返す', () => {
                const mockEntityId = 'mock-001';
                const mockServerId = 'mock-server-001';
                const mockVoiceChannelId = 'mock-voice-001';
                const mockTextChannelId = 'mock-text-001';

                const dmessage = new DiscordMessage({
                    id: mockEntityId,
                    content: 'dummy',
                    type: 'command',
                    serverId: mockServerId,
                    channelId: mockTextChannelId,
                    userId: 'dummy-user-id',
                    voiceChannelId: mockVoiceChannelId,
                    mentionedUsers: new Map(),
                });
                const input = new CommandInput({
                    id: mockEntityId,
                    argc: 0,
                    argv: [],
                    origin: dmessage,
                });

                const sb = settingsBlueprint();

                const ssb = serverStatusBlueprint();
                ssb.serverId = mockServerId;

                const vsb = voiceStatusBlueprint();
                vsb.serverId = mockServerId;
                vsb.voiceChannelId = mockVoiceChannelId;
                vsb.readingChannelsId = [mockTextChannelId];

                const sub = new LeaveCommand(
                    new Hanako(new Settings(sb), new ServerStatus(ssb), new VoiceStatus(vsb), null, null, null)
                );
                const res = sub.process(input);

                // 正しいアクションレスポンス
                res.type.should.equal('action');
                res.id.should.equal(mockEntityId);
                res.action.type.should.equal('leave_voice');
                res.action.serverId.should.equal(mockServerId);
                res.onSuccess.type.should.equal('silent');
                res.onFailure.type.should.equal('silent');
            });
        });

        context('異常系', () => {
            context('花子がVCに参加していない', () => {
                specify('エラー会話レスポンスを返す', () => {
                    const dmessage = new DiscordMessage({
                        id: 'mock',
                        content: 'dummy',
                        type: 'command',
                        serverId: 'mockserver',
                        channelId: 'mockchannel',
                        userId: 'mockuser',
                        voiceChannelId: 'mockchannel2',
                        mentionedUsers: new Map(),
                    });
                    const input = new CommandInput({
                        id: 'mock',
                        argc: 0,
                        argv: [],
                        origin: dmessage,
                    });

                    const sb = settingsBlueprint();

                    const ssb = serverStatusBlueprint();

                    const sub = new LeaveCommand(
                        new Hanako(new Settings(sb), new ServerStatus(ssb), null, null, null, null)
                    );
                    const res = sub.process(input);

                    // エラー会話レスポンス
                    res.type.should.equal('chat');
                    res.code.should.equal('error');
                });
            });
        });
    });
});

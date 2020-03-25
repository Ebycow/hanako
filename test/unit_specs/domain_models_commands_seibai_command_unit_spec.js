const should = require('chai').should();
const SeibaiCommand = require('../../src/domain/model/commands/seibai_command');
const DiscordMessage = require('../../src/domain/entity/discord_message');
const CommandInput = require('../../src/domain/entity/command_input');
const ServerStatus = require('../../src/domain/entity/server_status');

/************************************************************************
 * SeibaiCommandクラス単体スペック
 *
 * メソッド：#process
 * 期待動作：成敗アクションレスポンスの返却
 * 事前条件：花子VC参加済み ∧ 花子音声配信中
 * 備考：なし
 ***********************************************************************/

describe('SeibaiCommand', () => {
    // helper
    function serverStatusBlueprint() {
        return {
            serverId: 'mock-server-id',
            serverName: 'mock-server-name',
            voiceStatus: 'ready',
            voiceChannel: 'mock-voice-channel-id',
            readingChannels: ['mock-reading-channel-id'],
            wordDictionary: null,
        };
    }

    describe('Commandクラスメタスペック', () => {
        specify('typeは文字列を返す', () => {
            const sub = new SeibaiCommand(new ServerStatus(serverStatusBlueprint()));
            sub.type.should.be.a('string');
        });

        specify('namesは静的に文字列の配列を返す', () => {
            SeibaiCommand.names.should.be.an('array').that.is.not.empty;
            SeibaiCommand.names.forEach(name => name.should.be.a('string'));
        });

        specify('processメソッドを持つ', () => {
            const sub = new SeibaiCommand(new ServerStatus(serverStatusBlueprint()));
            sub.process.should.be.a('function');
        });
    });

    describe('#process', () => {
        context('正常系', () => {
            specify('正しい成敗アクションレスポンスを返す', () => {
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
                    voiceChannelId: mockVoiceChannelId,
                });
                const input = new CommandInput({
                    id: mockEntityId,
                    argc: 0,
                    argv: [],
                    origin: dmessage,
                });

                const blueprint = serverStatusBlueprint();
                blueprint.serverId = mockServerId;
                blueprint.voiceStatus = 'speaking';
                blueprint.voiceChannel = mockVoiceChannelId;
                blueprint.readingChannels = [mockTextChannelId];

                const sub = new SeibaiCommand(new ServerStatus(blueprint));
                const res = sub.process(input);

                // 正しいアクションレスポンス
                res.type.should.equal('action');
                res.id.should.equal(mockEntityId);
                res.action.type.should.equal('seibai');
                res.action.serverId.should.equal(mockServerId);
                res.onSuccess.type.should.equal('chat');
                res.onSuccess.code.should.equal('simple');
                res.onSuccess.channelId.should.equal(mockTextChannelId);
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
                        voiceChannelId: 'mockchannel2',
                    });
                    const input = new CommandInput({
                        id: 'mock',
                        argc: 0,
                        argv: [],
                        origin: dmessage,
                    });
                    const blueprint = serverStatusBlueprint();
                    blueprint.voiceStatus = null;
                    blueprint.voiceChannel = null;

                    const sub = new SeibaiCommand(new ServerStatus(blueprint));
                    const res = sub.process(input);

                    // エラー会話レスポンス
                    res.type.should.equal('chat');
                    res.code.should.equal('error');
                });
            });

            context('花子はVCに参加しているが、音声配信中ではない', () => {
                specify('エラー会話レスポンスを返す', () => {
                    const dmessage = new DiscordMessage({
                        id: 'mock',
                        content: 'dummy',
                        type: 'command',
                        serverId: 'mockserver',
                        channelId: 'mockchannel',
                        voiceChannelId: 'mockchannel2',
                    });
                    const input = new CommandInput({
                        id: 'mock',
                        argc: 0,
                        argv: [],
                        origin: dmessage,
                    });
                    const blueprint = serverStatusBlueprint();
                    blueprint.voiceStatus = 'ready';

                    const sub = new SeibaiCommand(new ServerStatus(blueprint));
                    const res = sub.process(input);

                    // エラー会話レスポンス
                    res.type.should.equal('chat');
                    res.code.should.equal('error');
                });
            });
        });
    });
});

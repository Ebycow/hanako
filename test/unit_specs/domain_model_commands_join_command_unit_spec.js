const should = require('chai').should();
const JoinCommand = require('../../src/domain/model/commands/join_command');
const DiscordMessage = require('../../src/domain/entity/discord_message');
const CommandInput = require('../../src/domain/entity/command_input');

/************************************************************************
 * JoinCommandクラス単体スペック
 *
 * メソッド：#process
 * 期待動作：VC参加アクションレスポンスの返却
 * 前提条件：送信者VC参加済み
 * 備考：なし
 ***********************************************************************/

describe('JoinCommand', () => {
    describe('Commandクラスメタスペック', () => {
        specify('typeは文字列を返す', () => {
            const sub = new JoinCommand();
            sub.type.should.be.a('string');
        });

        specify('namesは静的に文字列の配列を返す', () => {
            JoinCommand.names.should.be.an('array').that.is.not.empty;
            JoinCommand.names.forEach(name => name.should.be.a('string'));
        });

        specify('processメソッドを持つ', () => {
            const sub = new JoinCommand();
            sub.process.should.be.a('function');
        });
    });

    describe('#process', () => {
        context('正常系', () => {
            specify('正しいVC参加アクションレスポンスを返す', () => {
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

                const sub = new JoinCommand();
                const res = sub.process(input);

                // 正しいアクションレスポンス
                res.type.should.equal('action');
                res.id.should.equal(mockEntityId);
                res.action.type.should.equal('join_voice');
                res.action.voiceChannelId.should.equal(mockVoiceChannelId);
                res.action.textChannelId.should.equal(mockTextChannelId);
                res.onSuccess.type.should.equal('chat');
                res.onSuccess.code.should.equal('simple');
                res.onSuccess.channelId.should.equal(mockTextChannelId);
                res.onSuccess.content.should.have.string(mockTextChannelId);
                res.onFailure.type.should.equal('silent');
            });
        });

        context('異常系', () => {
            context('送信者がVCに参加していない', () => {
                specify('エラー会話レスポンスを返す', () => {
                    const dmessage = new DiscordMessage({
                        id: 'mock',
                        content: 'dummy',
                        type: 'command',
                        serverId: 'mockserver',
                        channelId: 'mockchannel',
                        userId: 'mockuser',
                        voiceChannelId: null,
                        mentionedUsers: new Map(),
                    });
                    const input = new CommandInput({
                        id: 'mock',
                        argc: 0,
                        argv: [],
                        origin: dmessage,
                    });

                    const sub = new JoinCommand();
                    const res = sub.process(input);

                    // エラー会話レスポンス
                    res.type.should.equal('chat');
                    res.code.should.equal('error');
                });
            });
        });
    });
});

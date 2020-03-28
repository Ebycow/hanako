const should = require('chai').should();
const AskCommand = require('../../src/domain/model/commands/ask_command');
const DiscordMessage = require('../../src/domain/entity/discord_message');
const CommandInput = require('../../src/domain/entity/command_input');

/************************************************************************
 * AskCommandクラス単体スペック
 *
 * メソッド：#process
 * 期待動作：会話レスポンスの返却
 * 前提条件：なし
 * 備考：なし
 ***********************************************************************/

describe('AskCommand', () => {
    describe('Commandクラスメタスペック', () => {
        specify('typeは文字列を返す', () => {
            const sub = new AskCommand();
            sub.type.should.be.a('string');
        });

        specify('namesは静的に文字列の配列を返す', () => {
            AskCommand.names.should.be.an('array').that.is.not.empty;
            AskCommand.names.forEach(name => name.should.be.a('string'));
        });

        specify('processメソッドを持つ', () => {
            const sub = new AskCommand();
            sub.process.should.be.a('function');
        });
    });

    describe('#process', () => {
        context('正常系', () => {
            specify('正しい会話レスポンスを返す', () => {
                const mockEntityId = 'mock-001';
                const mockTextChannelId = 'mock-text-001';

                const dmessage = new DiscordMessage({
                    id: mockEntityId,
                    content: 'dummy',
                    type: 'command',
                    serverId: 'dummy-server-id',
                    channelId: mockTextChannelId,
                    voiceChannelId: null,
                    mentionedUsers: new Map(),
                });
                const input = new CommandInput({
                    id: mockEntityId,
                    argc: 0,
                    argv: [],
                    origin: dmessage,
                });

                const sub = new AskCommand();
                const res = sub.process(input);

                // 正しい会話レスポンス
                res.type.should.equal('chat');
                res.id.should.equal(mockEntityId);
                res.code.should.equal('simple');
                res.channelId.should.equal(mockTextChannelId);
                res.content.should.be.oneOf(['はい', 'いいえ']);
            });
        });
    });
});

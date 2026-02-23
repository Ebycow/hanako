const should = require('chai').should();
const { commandInputBlueprint, dmessageBlueprint } = require('../helpers/blueprints');
const ChatResponse = require('../../src/domain/entity/responses/chat_response');

/************************************************************************
 * CommandInputエンティティ単体スペック
 *
 * 期待動作：コマンド引数を保持し消費操作をサポートする
 * 備考：なし
 ***********************************************************************/

describe('CommandInput', () => {
    describe('ゲッター', () => {
        specify('idを返す', () => {
            const input = commandInputBlueprint({}, { id: 'test-id' });
            input.id.should.equal('test-id');
        });

        specify('argcを返す', () => {
            const input = commandInputBlueprint({ argc: 2, argv: ['a', 'b'] });
            input.argc.should.equal(2);
        });

        specify('argvはコピーを返す', () => {
            const input = commandInputBlueprint({ argc: 1, argv: ['arg1'] });
            const returned = input.argv;
            returned.push('arg2');
            input.argv.length.should.equal(1);
        });

        specify('serverIdをoriginから委譲する', () => {
            const input = commandInputBlueprint({}, { serverId: 'server-001' });
            input.serverId.should.equal('server-001');
        });

        specify('userIdをoriginから委譲する', () => {
            const input = commandInputBlueprint({}, { userId: 'user-001' });
            input.userId.should.equal('user-001');
        });

        specify('channelIdをoriginから委譲する', () => {
            const input = commandInputBlueprint({}, { channelId: 'channel-001' });
            input.channelId.should.equal('channel-001');
        });

        specify('voiceChannelIdをoriginから委譲する', () => {
            const input = commandInputBlueprint({}, { voiceChannelId: 'vc-001' });
            input.voiceChannelId.should.equal('vc-001');
        });

        specify('mentionedUsersをoriginから委譲する', () => {
            const mentions = new Map([['user1', 'User One']]);
            const input = commandInputBlueprint({}, { mentionedUsers: mentions });
            input.mentionedUsers.size.should.equal(1);
        });

        specify('attachmentsをoriginから委譲する', () => {
            const origin = dmessageBlueprint();
            const input = commandInputBlueprint({ origin });
            input.attachments.should.be.an('array');
        });
    });

    describe('#consume', () => {
        specify('引数を1つ消費した新しいエンティティを返す', () => {
            const input = commandInputBlueprint({ argc: 2, argv: ['first', 'second'] });
            const consumed = input.consume();
            consumed.argc.should.equal(1);
            consumed.argv.should.deep.equal(['second']);
        });

        specify('argc=0のとき自身を返す', () => {
            const input = commandInputBlueprint({ argc: 0, argv: [] });
            const consumed = input.consume();
            consumed.should.equal(input);
        });

        specify('消費しても元のエンティティは変化しない', () => {
            const input = commandInputBlueprint({ argc: 2, argv: ['first', 'second'] });
            input.consume();
            input.argc.should.equal(2);
            input.argv.should.deep.equal(['first', 'second']);
        });
    });

    describe('#newChatResponse', () => {
        specify('ChatResponseを生成する', () => {
            const input = commandInputBlueprint({}, { channelId: 'ch-001' });
            const res = input.newChatResponse('テスト内容');
            res.should.be.an.instanceOf(ChatResponse);
            res.type.should.equal('chat');
            res.content.should.equal('テスト内容');
            res.channelId.should.equal('ch-001');
            res.code.should.equal('simple');
        });

        specify('codeを指定できる', () => {
            const input = commandInputBlueprint();
            const res = input.newChatResponse('エラー', 'error');
            res.code.should.equal('error');
        });

        specify('pagerコードを指定できる', () => {
            const input = commandInputBlueprint();
            const res = input.newChatResponse('ページ', 'pager');
            res.code.should.equal('pager');
        });
    });

    describe('#toString', () => {
        specify('文字列表現を返す', () => {
            const input = commandInputBlueprint();
            input.toString().should.be.a('string');
        });
    });
});

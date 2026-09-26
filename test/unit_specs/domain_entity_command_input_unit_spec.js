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

    describe('名前付きの引数と入力元', () => {
        specify('argsを省略すると空のオブジェクトになる', () => {
            const input = commandInputBlueprint();
            input.args.should.deep.equal({});
        });

        specify('テキスト投稿から作られたときsourceはtext', () => {
            const input = commandInputBlueprint({}, { type: 'command' });
            input.source.should.equal('text');
        });

        specify('スラッシュコマンドから作られたときsourceはslash', () => {
            const input = commandInputBlueprint({}, { type: 'interaction' });
            input.source.should.equal('slash');
        });

        specify('withArgsは引数を持たせた新しいエンティティを返し、元は変化しない', () => {
            const input = commandInputBlueprint({ argc: 1, argv: ['a'] });
            const withArgs = input.withArgs({ from: 'a' });
            withArgs.args.should.deep.equal({ from: 'a' });
            withArgs.argv.should.deep.equal(['a']);
            input.args.should.deep.equal({});
        });

        specify('usageは入力元に合わせた書き方を返す', () => {
            commandInputBlueprint({}, { type: 'command' }).usage('@hanako help', '/help').should.equal('@hanako help');
            commandInputBlueprint({}, { type: 'interaction' }).usage('@hanako help', '/help').should.equal('/help');
        });

        specify('consumeしてもargsは引き継がれる', () => {
            const input = commandInputBlueprint({ argc: 2, argv: ['a', 'b'], args: { x: 1 } });
            input.consume().args.should.deep.equal({ x: 1 });
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

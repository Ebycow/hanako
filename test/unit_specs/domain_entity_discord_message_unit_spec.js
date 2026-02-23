const should = require('chai').should();
const { DiscordMessage, dmessageBlueprint } = require('../helpers/blueprints');

/************************************************************************
 * DiscordMessageエンティティ単体スペック
 *
 * 期待動作：不変なメッセージエンティティとして機能する
 * 備考：なし
 ***********************************************************************/

describe('DiscordMessage', () => {
    describe('構築', () => {
        specify('正しいデータで構築できる', () => {
            const dm = dmessageBlueprint();
            dm.should.be.an.instanceOf(DiscordMessage);
        });

        specify('type=commandで構築できる', () => {
            const dm = dmessageBlueprint({ type: 'command' });
            dm.type.should.equal('command');
        });

        specify('type=interactionで構築できる', () => {
            const dm = dmessageBlueprint({ type: 'interaction' });
            dm.type.should.equal('interaction');
        });

        specify('type=readで構築できる', () => {
            const dm = dmessageBlueprint({ type: 'read' });
            dm.type.should.equal('read');
        });
    });

    describe('ゲッター', () => {
        specify('idを返す', () => {
            const dm = dmessageBlueprint({ id: 'test-id' });
            dm.id.should.equal('test-id');
        });

        specify('contentを返す', () => {
            const dm = dmessageBlueprint({ content: 'テスト内容' });
            dm.content.should.equal('テスト内容');
        });

        specify('serverIdを返す', () => {
            const dm = dmessageBlueprint({ serverId: 'server-001' });
            dm.serverId.should.equal('server-001');
        });

        specify('channelIdを返す', () => {
            const dm = dmessageBlueprint({ channelId: 'channel-001' });
            dm.channelId.should.equal('channel-001');
        });

        specify('userIdを返す', () => {
            const dm = dmessageBlueprint({ userId: 'user-001' });
            dm.userId.should.equal('user-001');
        });

        specify('voiceChannelIdを返す（文字列）', () => {
            const dm = dmessageBlueprint({ voiceChannelId: 'vc-001' });
            dm.voiceChannelId.should.equal('vc-001');
        });

        specify('voiceChannelIdがnullの場合', () => {
            const dm = dmessageBlueprint({ voiceChannelId: null });
            should.equal(dm.voiceChannelId, null);
        });
    });

    describe('不変性', () => {
        specify('mentionedUsersはコピーを返す', () => {
            const mentions = new Map([['user1', 'User One']]);
            const dm = dmessageBlueprint({ mentionedUsers: mentions });
            const returned = dm.mentionedUsers;
            returned.set('user2', 'User Two');
            dm.mentionedUsers.size.should.equal(1);
        });

        specify('attachmentsはコピーを返す', () => {
            const attachments = [{ name: 'file.png', url: 'mock://file.png' }];
            const dm = new DiscordMessage({
                id: 'test-id',
                content: 'dummy',
                type: 'command',
                serverId: 'server-id',
                channelId: 'channel-id',
                userId: 'user-id',
                voiceChannelId: null,
                mentionedUsers: new Map(),
                attachments,
            });
            const returned = dm.attachments;
            returned.push({ name: 'file2.png', url: 'mock://file2.png' });
            dm.attachments.length.should.equal(1);
        });

        specify('attachments未指定なら空配列を返す', () => {
            const dm = dmessageBlueprint();
            dm.attachments.should.deep.equal([]);
        });
    });

    describe('#toString', () => {
        specify('文字列表現を返す', () => {
            const dm = dmessageBlueprint({ id: 'test-id' });
            dm.toString().should.be.a('string');
            dm.toString().should.include('test-id');
        });
    });
});

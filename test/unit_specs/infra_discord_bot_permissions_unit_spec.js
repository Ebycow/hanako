require('chai').should();
const { PermissionFlagsBits, PermissionsBitField } = require('discord.js');
const { missingBotPermissions, describeMissingPermissions } = require('../../src/infra/discord/bot_permissions');

/**
 * bot_permissions 単体スペック
 */
describe('bot_permissions', () => {
    /**
     * @param {bigint[]|null} granted 花子が持つ権限（nullなら解決できない）
     */
    function channelBlueprint(granted) {
        return {
            id: 'channel-id',
            guild: { members: { me: { id: 'hanako-id' } } },
            permissionsFor: () => (granted === null ? null : new PermissionsBitField(granted)),
        };
    }

    const required = [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.Connect, PermissionFlagsBits.Speak];

    specify('権限が足りていれば空配列', () => {
        const channel = channelBlueprint(required);
        missingBotPermissions(channel, required).should.deep.equal([]);
    });

    specify('足りない権限をサーバー設定画面での表示名で返す', () => {
        const channel = channelBlueprint([PermissionFlagsBits.ViewChannel]);
        missingBotPermissions(channel, required).should.deep.equal(['接続', '発言']);
    });

    specify('権限を解決できないときはすべて足りないものとして扱う', () => {
        const channel = channelBlueprint(null);
        missingBotPermissions(channel, required).should.deep.equal(['チャンネルを見る', '接続', '発言']);
    });

    specify('説明文にチャンネルと権限名が含まれる', () => {
        const channel = channelBlueprint([]);
        const text = describeMissingPermissions(channel, ['接続', '発言']);
        text.should.have.string('<#channel-id>');
        text.should.have.string('「接続」「発言」');
    });
});

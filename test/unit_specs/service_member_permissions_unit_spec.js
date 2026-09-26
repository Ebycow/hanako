require('chai').should();
const { PermissionFlagsBits, PermissionsBitField } = require('discord.js');
const { permissionFlagOf, memberPermissionNames } = require('../../src/service/member_permissions');

/************************************************************************
 * member_permissions単体スペック
 *
 * 期待動作：花子の権限名とDiscordの権限フラグを相互に対応させる
 * 備考：なし
 ***********************************************************************/

describe('member_permissions', () => {
    function member(...flags) {
        return { permissions: new PermissionsBitField(flags) };
    }

    describe('#permissionFlagOf', () => {
        specify('権限名をDiscordの権限フラグにする', () => {
            permissionFlagOf('manageGuild').should.equal(PermissionFlagsBits.ManageGuild);
            permissionFlagOf('moderateMembers').should.equal(PermissionFlagsBits.ModerateMembers);
        });

        specify('未対応の権限名はエラー', () => {
            (() => permissionFlagOf('unknown')).should.throw();
        });
    });

    describe('#memberPermissionNames', () => {
        specify('持っている権限名だけを返す', () => {
            memberPermissionNames(member(PermissionFlagsBits.ModerateMembers)).should.deep.equal(['moderateMembers']);
        });

        specify('管理者はすべての権限を持つ', () => {
            memberPermissionNames(member(PermissionFlagsBits.Administrator)).should.deep.equal([
                'manageGuild',
                'moderateMembers',
            ]);
        });

        specify('メンバー情報がなければ何も持たない', () => {
            memberPermissionNames(null).should.deep.equal([]);
        });
    });
});

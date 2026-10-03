const { PermissionFlagsBits } = require('discord.js');

/** @typedef {import('discord.js').GuildMember} discord.GuildMember */
/** @typedef {import('../domain/model/commands').PermissionName} PermissionName */

/**
 * 花子の権限名とDiscordの権限フラグの対応
 *
 * @type {Readonly<Record<PermissionName, bigint>>}
 */
const PERMISSION_FLAGS = Object.freeze({
    manageGuild: PermissionFlagsBits.ManageGuild,
    moderateMembers: PermissionFlagsBits.ModerateMembers,
});

/**
 * 花子の権限名をDiscordの権限フラグにする
 *
 * @param {PermissionName} name 権限名
 * @returns {bigint} Discordの権限フラグ
 */
function permissionFlagOf(name) {
    const flag = PERMISSION_FLAGS[name];
    if (typeof flag === 'undefined') {
        throw new Error(`未対応の権限名 ${name}`);
    }
    return flag;
}

/**
 * メンバーが持っている花子の権限名の一覧
 * Note: 管理者（Administrator）はすべての権限を持つものとして扱われる
 *
 * @param {?discord.GuildMember} member サーバーのメンバー
 * @returns {PermissionName[]} 持っている権限名
 */
function memberPermissionNames(member) {
    if (!member || !member.permissions) {
        return [];
    }
    return Object.keys(PERMISSION_FLAGS).filter((name) => member.permissions.has(PERMISSION_FLAGS[name]));
}

module.exports = { permissionFlagOf, memberPermissionNames };

/** @typedef {import('./commands').PermissionName} PermissionName */

/**
 * 権限名とDiscordの画面での呼び方
 *
 * @type {Readonly<Record<PermissionName, string>>}
 */
const PERMISSION_LABELS = Object.freeze({
    manageGuild: 'サーバー管理',
    moderateMembers: 'メンバーをタイムアウト',
});

module.exports = PERMISSION_LABELS;

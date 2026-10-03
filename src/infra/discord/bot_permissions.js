const { PermissionsBitField } = require('discord.js');

/** @typedef {import('discord.js').GuildChannel} discord.GuildChannel */
/** @typedef {import('discord.js').PermissionResolvable} discord.PermissionResolvable */

/**
 * Discordの権限フラグ名と、サーバー設定画面での表示名の対応
 */
const PERMISSION_LABELS = Object.freeze({
    ViewChannel: 'チャンネルを見る',
    Connect: '接続',
    Speak: '発言',
    SendMessages: 'メッセージを送信',
});

/**
 * チャンネルで花子自身に足りない権限を、サーバー設定画面での表示名で返す
 *
 * @param {discord.GuildChannel} channel 対象のチャンネル
 * @param {discord.PermissionResolvable[]} required 必要な権限
 * @returns {string[]} 足りない権限の表示名（足りていれば空配列）
 */
function missingBotPermissions(channel, required) {
    const permissions = channel.permissionsFor(channel.guild.members.me);
    // 権限を解決できないときは、すべて足りないものとして扱う
    const missing = permissions ? permissions.missing(required) : new PermissionsBitField(required).toArray();
    return missing.map((flag) => PERMISSION_LABELS[flag] || flag);
}

/**
 * 足りない権限を利用者向けに説明する文を作る
 *
 * @param {discord.GuildChannel} channel 対象のチャンネル
 * @param {string[]} labels 足りない権限の表示名
 * @returns {string}
 */
function describeMissingPermissions(channel, labels) {
    const names = labels.map((label) => `「${label}」`).join('');
    return `<#${channel.id}> で ${names} の権限がないみたい… サーバーの管理者にはなこの権限を確認してもらってね :pleading_face:`;
}

module.exports = {
    missingBotPermissions,
    describeMissingPermissions,
};

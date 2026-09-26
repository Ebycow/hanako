const { SlashCommandBuilder } = require('discord.js');
const commands = require('../domain/model/commands');
const { permissionFlagOf } = require('./member_permissions');

/** @typedef {import('../domain/model/commands').SlashCommandDefinition} SlashCommandDefinition */
/** @typedef {import('../domain/model/commands').SlashCommandOption} SlashCommandOption */
/** @typedef {import('../domain/model/commands').PermissionName} PermissionName */

/**
 * (private) オプション定義をビルダーに追加する
 *
 * @param {SlashCommandBuilder} builder
 * @param {SlashCommandOption} def
 * @returns {SlashCommandBuilder}
 */
function addOptionF(builder, def) {
    const setup = (option) => {
        option.setName(def.name).setDescription(def.description).setRequired(def.required);
        if (typeof def.minValue === 'number') option.setMinValue(def.minValue);
        if (typeof def.maxValue === 'number') option.setMaxValue(def.maxValue);
        return option;
    };

    switch (def.type) {
        case 'string':
            return builder.addStringOption(setup);
        case 'integer':
            return builder.addIntegerOption(setup);
        case 'boolean':
            return builder.addBooleanOption(setup);
        case 'user':
            return builder.addUserOption(setup);
        case 'attachment':
            return builder.addAttachmentOption(setup);
        default:
            throw new Error(`未対応のオプション型 ${def.type}`);
    }
}

/**
 * スラッシュコマンドの定義をDiscordに登録するJSONに変換する
 *
 * @param {SlashCommandDefinition} def スラッシュコマンドの定義
 * @param {?PermissionName} [requiredPermission=null] 実行に必要な権限（誰でも使えるならnull）
 * @returns {object} Discordに登録するJSON
 */
function toSlashCommandJSON(def, requiredPermission = null) {
    const builder = new SlashCommandBuilder().setName(def.name).setDescription(def.description);
    if (requiredPermission) {
        // 使える人の初期値。サーバー管理者は連携サービスの設定でロールやメンバーごとに変えられる
        builder.setDefaultMemberPermissions(permissionFlagOf(requiredPermission));
    }
    def.options.forEach((option) => addOptionF(builder, option));
    return builder.toJSON();
}

/**
 * スラッシュコマンドを持つすべてのコマンドの登録用JSONを作る
 *
 * @returns {object[]} Discordに登録するJSONの配列
 */
function buildSlashCommandsJSON() {
    return Object.values(commands)
        .filter((K) => K.slash)
        .map((K) => toSlashCommandJSON(K.slash, K.requiredPermission || null));
}

module.exports = { toSlashCommandJSON, buildSlashCommandsJSON };

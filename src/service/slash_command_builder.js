const { SlashCommandBuilder } = require('discord.js');
const commands = require('../domain/model/commands');

/** @typedef {import('../domain/model/commands').SlashCommandDefinition} SlashCommandDefinition */
/** @typedef {import('../domain/model/commands').SlashCommandOption} SlashCommandOption */

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
 * @returns {object} Discordに登録するJSON
 */
function toSlashCommandJSON(def) {
    const builder = new SlashCommandBuilder().setName(def.name).setDescription(def.description);
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
        .map((K) => toSlashCommandJSON(K.slash));
}

module.exports = { toSlashCommandJSON, buildSlashCommandsJSON };

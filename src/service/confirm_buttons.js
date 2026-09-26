const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

const CONFIRM_PREFIX = 'hanako:confirm:';
const CANCEL_ID = 'hanako:confirm-cancel';

/**
 * 破壊的なスラッシュコマンドの実行を確かめるボタン
 * Note: テキスト投稿で `--force` を付けて確定するのと同じ役割
 *
 * @param {string} commandName 確定したときに実行するスラッシュコマンド名
 * @returns {ActionRowBuilder} ボタンの行
 */
function confirmButtonRow(commandName) {
    return new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId(CONFIRM_PREFIX + commandName)
            .setLabel('実行する')
            .setStyle(ButtonStyle.Danger),
        new ButtonBuilder().setCustomId(CANCEL_ID).setLabel('やめておく').setStyle(ButtonStyle.Secondary)
    );
}

/**
 * ボタンのカスタムIDから確認ボタンの種類を得る
 *
 * @param {string} customId ボタンのカスタムID
 * @returns {?({confirmed: true, commandName: string}|{confirmed: false})} 確認ボタンでなければnull
 */
function parseConfirmButton(customId) {
    if (customId === CANCEL_ID) {
        return { confirmed: false };
    }
    if (customId.startsWith(CONFIRM_PREFIX)) {
        return { confirmed: true, commandName: customId.slice(CONFIRM_PREFIX.length) };
    }
    return null;
}

module.exports = { confirmButtonRow, parseConfirmButton };

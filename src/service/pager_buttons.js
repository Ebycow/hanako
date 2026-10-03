const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

// ボタンのカスタムIDとページ送りの方向の対応
const DIRECTIONS = Object.freeze({
    'hanako:pager:backward': 'backward',
    'hanako:pager:forward': 'forward',
});

/**
 * スラッシュコマンドの一覧表示に付けるページ送りボタン
 * Note: 実行者にだけ見える返信にはリアクションを付けられないため、テキスト投稿の 👈👉 リアクションの代わりにボタンを使う
 *
 * @returns {ActionRowBuilder} ボタンの行
 */
function pagerButtonRow() {
    return new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('hanako:pager:backward').setEmoji('👈').setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId('hanako:pager:forward').setEmoji('👉').setStyle(ButtonStyle.Secondary)
    );
}

/**
 * ボタンのカスタムIDからページ送りの方向を得る
 *
 * @param {string} customId ボタンのカスタムID
 * @returns {?('forward'|'backward')} ページ送りボタンでなければnull
 */
function pagerDirectionOf(customId) {
    return DIRECTIONS[customId] || null;
}

module.exports = { pagerButtonRow, pagerDirectionOf };

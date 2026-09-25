const emojiData = require('emojibase-data/ja/compact.json');

/** @typedef {import('discord.js').Message} discord.Message */

const tagRe = /<(a?:.+?:\d+)?(@!?\d+)?(#\d+)?(@!?&\d+)?>/g;
const emojiRe = /:(.+):/;
const unicodeEmojiRe = /\p{RGI_Emoji}/gv;

// 異体字セレクタを除去して、表示形式の違いを同一視する
const removeVariationSelectors = (text) => text.replace(/[︎️]/g, '');
// 肌の色の修飾子を除去して、肌の色違いを元の絵文字と同一視する
const removeSkinTones = (text) => text.replace(/[\u{1F3FB}-\u{1F3FF}]/gu, '');

// 絵文字 → Unicode公式(CLDR)の日本語名
const emojiNames = new Map(
    emojiData.map((e) => [removeVariationSelectors(e.unicode), e.label.replace(/\s*:\s*/g, ' ').trim()])
);

/**
 * ディスコードの内部タグ表現を標準表示形式に置換
 *
 * @param {discord.Message} message
 * @param {string} text
 * @returns {string}
 */
function replaceDiscordTags(message, text) {
    const maybe = (m) => (m ? m : {});
    const resolveRoleName = (x) => maybe(message.mentions.roles.find((r) => x === r.id)).name;
    const resolveChannelName = (x) => maybe(message.mentions.channels.find((c) => x === c.id)).name;
    const resolveUserName = (x) =>
        message.mentions.members ? maybe(message.mentions.members.find((m) => x === m.id)).displayName : undefined;

    let content = text;
    content = content.replace(tagRe, (_, emojiTag, userTag, channelTag, roleTag) => {
        if (typeof emojiTag !== 'undefined') {
            const emojiName = emojiTag.match(emojiRe)[1];
            return ':' + emojiName + ':';
        }
        if (typeof userTag !== 'undefined') {
            const head = userTag.startsWith('@!') ? 2 : 1;
            const userId = userTag.slice(head);
            return '@' + (resolveUserName(userId) || '誰ですか？');
        }
        if (typeof channelTag !== 'undefined') {
            const channelId = channelTag.slice(1);
            return '#' + (resolveChannelName(channelId) || 'どこですか？');
        }
        if (typeof roleTag !== 'undefined') {
            const roleId = roleTag.slice(2);
            return '@' + (resolveRoleName(roleId) || '誰ですか？');
        }

        throw new Error('unreachable');
    });

    return content;
}

/**
 * Unicodeコードポイントで表現される絵文字を":日本語名:"に変換
 * 肌の色の違いは読まず、元の絵文字と同じ名前にする
 *
 * @param {string} text
 * @returns {string}
 */
function replaceUnicodeEmojis(text) {
    return text.replace(unicodeEmojiRe, (emoji) => {
        const key = removeVariationSelectors(emoji);
        const name = emojiNames.get(key) || emojiNames.get(removeSkinTones(key));
        return name ? `:${name}:` : emoji;
    });
}

/**
 * ミドルウェア
 * メッセージ内容を標準化する
 */
class MessageSanitizeMiddleWare {
    /**
     * ミドルウェア変換
     *
     * @param {discord.Message} message 受信したメッセージ
     * @returns {Promise<[discord.Message, string]>} 標準化済みテキストを添えてコントローラに渡す
     */
    async transform(message) {
        let content = replaceDiscordTags(message, message.content);
        content = replaceUnicodeEmojis(content);

        // ステッカーの名前を読み上げテキストに変換
        if (message.stickers.size) {
            message.stickers.forEach((sticker) => {
                content += sticker.name;
            });
        }

        return Promise.resolve([message, content]);
    }
}

module.exports = MessageSanitizeMiddleWare;

const emoji = require('node-emoji');

/** @typedef {import('discord.js').Message} discord.Message */

const tagRe = /<(a?:.+?:\d+)?(@!?\d+)?(#\d+)?(@!?&\d+)?>/g;
const emojiRe = /:(.+):/;

/**
 * ディスコードの内部タグ表現を標準表示形式に置換
 *
 * @param {discord.Message} message
 * @param {string} text
 * @returns {string}
 */
function replaceDiscordTags(message, text) {
    const maybe = m => (m ? m : {});
    const resolveRoleName = x => maybe(message.mentions.roles.find(r => x === r.id)).name;
    const resolveChannelName = x => maybe(message.mentions.channels.find(c => x === c.id)).name;
    const resolveUserName = x =>
        message.mentions.members ? maybe(message.mentions.members.find(m => x === m.id)).displayName : undefined;

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
            const roleId = roleTag.slice(1);
            return '@' + (resolveRoleName(roleId) || '誰ですか？');
        }

        throw new Error('unreachable');
    });

    return content;
}

/**
 * Unicodeコードポイントで表現される絵文字を":英名:"に変換
 *
 * @param {string} text
 * @returns {string}
 */
function replaceUnicodeEmojis(text) {
    return emoji.replace(text, emoji => `:${emoji.key}:`);
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
        return Promise.resolve([message, content]);
    }
}

module.exports = MessageSanitizeMiddleWare;

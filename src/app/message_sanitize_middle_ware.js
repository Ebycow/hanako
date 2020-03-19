const emoji = require('node-emoji');

/** @typedef {import('discord.js').Client} discord.Client */
/** @typedef {import('discord.js').Message} discord.Message */

const tagRe = /<(a?:.+?:\d+)?(@!?\d+)?(#\d+)?(@!?&\d+)?>/g;
const emojiRe = /:(.+):/;

/**
 * ディスコードの内部タグ表現を標準表示形式に置換
 *
 * @param {discord.Message} message
 * @returns {discord.Message}
 */
function replaceDiscordTags(message) {
    const maybe = m => (m ? m : {});
    const resolveUserName = x => maybe(message.mentions.members.find(m => x === m.id)).displayName;
    const resolveRoleName = x => maybe(message.mentions.roles.find(r => x === r.id)).name;
    const resolveChannelName = x => maybe(message.mentions.channels.find(c => x === c.id)).name;

    let content = message.content;
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

    message.content = content;
    return message;
}

/**
 * Unicodeコードポイントで表現される絵文字を":英名:"に変換
 *
 * @param {discord.Message} message
 * @returns {discord.Message}
 */
function replaceUnicodeEmojis(message) {
    message.content = emoji.replace(message.content, emoji => `:${emoji.key}:`);
    return message;
}

/**
 * ミドルウェア
 * メッセージ内容を標準化する
 */
class MessageSanitizeMiddleWare {
    /**
     * @param {discord.Client} client Discord Botのクライアント
     */
    constructor(client) {
        this.client = client;
    }

    /**
     * ミドルウェア変換
     *
     * @param {discord.Message} message 受信したメッセージ
     * @returns {Promise<discord.Message>} 標準化済みメッセージ
     */
    async transform(message) {
        let newMessage = replaceDiscordTags(message);
        newMessage = replaceUnicodeEmojis(newMessage);
        return Promise.resolve(newMessage);
    }
}

module.exports = MessageSanitizeMiddleWare;

const sanitizeContent = require('../core/utils/sanitize_content');

/** @typedef {import('discord.js').Message} discord.Message */

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
        const maybe = (m) => (m ? m : {});
        let content = sanitizeContent(message.content, {
            user: (id) =>
                message.mentions.members
                    ? maybe(message.mentions.members.find((m) => id === m.id)).displayName
                    : undefined,
            role: (id) => maybe(message.mentions.roles.find((r) => id === r.id)).name,
            channel: (id) => maybe(message.mentions.channels.find((c) => id === c.id)).name,
        });

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

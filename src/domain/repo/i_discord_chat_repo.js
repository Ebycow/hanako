const Interface = require('../../core/interface');

/** @typedef {import('../entity/responses/chat_response')} ChatResponse */

/**
 * Discord会話リポジトリ
 */
class IDiscordChatRepo extends Interface {
    /**
     * Discordに会話を投稿
     *
     * @param {ChatResponse} chat 会話レスポンスエンティティ
     * @returns {Promise<void>}
     */
    async postChat(chat) {}
}

module.exports = IDiscordChatRepo;

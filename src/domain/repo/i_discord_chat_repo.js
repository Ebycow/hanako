const Interface = require('../../core/interface');

/** @typedef {import('../entity/responses/chat_response')} ChatResponse */

/**
 * ディスコード会話リポジトリ
 */
class IDiscordChatRepo extends Interface {
    /**
     * ディスコードに会話を投稿
     *
     * @param {ChatResponse} chat 会話レスポンスエンティティ
     * @returns {Promise<void>}
     */
    async postChat(chat) {}
}

module.exports = IDiscordChatRepo;

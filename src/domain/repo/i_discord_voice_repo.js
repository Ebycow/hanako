const Interface = require('../../core/interface');

/** @typedef {import('../entity/responses/voice_response')} VoiceResponse */

/**
 * ディスコード音声リポジトリ
 */
class IDiscordVoiceRepo extends Interface {
    /**
     * ディスコードに音声を送信
     *
     * @param {VoiceResponse} voice 音声レスポンスエンティティ
     * @returns {Promise<void>}
     */
    async postVoice(voice) {}
}

module.exports = IDiscordVoiceRepo;

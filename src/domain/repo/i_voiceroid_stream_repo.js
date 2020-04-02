const Interface = require('../../core/interface');

/** @typedef {import('stream').Readable} Readable */
/** @typedef {import('../entity/audios/voiceroid_audio')} VoiceroidAudio */

/**
 * ボイスロイド音声ストリームリポジトリ
 */
class IVoiceroidStreamRepo extends Interface {
    /**
     * オーディオエンティティに対応する音声ストリームを取得
     *
     * @param {VoiceroidAudio} audio ボイスロイドオーディオエンティティ
     * @returns {Promise<Readable>} 16-bit 48kHz StereoのPCMオーディオストリーム
     */
    async getVoiceroidStream(audio) {}
}

module.exports = IVoiceroidStreamRepo;

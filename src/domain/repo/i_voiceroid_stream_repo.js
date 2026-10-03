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
     * @param {AbortSignal} [signal] 中断の合図。中断されたら取得中のリクエストと音声ストリームを破棄する
     * @returns {Promise<Readable>} 16-bit 48kHz StereoのPCMオーディオストリーム
     */
    async getVoiceroidStream(audio, signal) {}
}

module.exports = IVoiceroidStreamRepo;

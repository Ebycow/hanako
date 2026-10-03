const Interface = require('../../core/interface');

/** @typedef {import('../entity/voice_status')} VoiceStatus */

/**
 * 花子の音声ステータスリポジトリ
 */
class IVoiceStatusRepo extends Interface {
    /**
     * VoiceStatusを読み出し
     * - 花子が音声接続していない場合はnull
     *
     * @param {string} serverId DiscordサーバーID
     * @returns {Promise<VoiceStatus>|Promise<null>} 対象Discordサーバーの音声ステータス またはnull
     */
    async loadVoiceStatus(serverId) {}

    /**
     * すべての有効なVoiceStatusを読み出し
     *
     * @returns {Promise<Array<VoiceStatus>>} すべての有効なVoiceStatusの配列
     */
    async loadAllVoiceStatus() {}

    /**
     * 起動してから読み上げ（再生キューに追加）した回数を読み出し
     *
     * @returns {Promise<number>} 読み上げ回数
     */
    async loadReadCount() {}
}

module.exports = IVoiceStatusRepo;

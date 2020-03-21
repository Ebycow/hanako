const Interface = require('../../core/interface');

/** @typedef {import('../entities/actions/join_voice_action')} JoinVoiceAction */

/**
 * ディスコードVC関連アクションのリポジトリ
 */
class IDiscordVcActionRepo extends Interface {
    /**
     * VC参加アクションを投稿
     *
     * @param {JoinVoiceAction} action VC参加アクション
     * @returns {Promise<void>}
     */
    async postJoinVoice(action) {}
}

module.exports = IDiscordVcActionRepo;

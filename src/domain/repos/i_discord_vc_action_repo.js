const Interface = require('../../core/interface');

/** @typedef {import('../entities/actions/join_voice_action')} JoinVoiceAction */
/** @typedef {import('../entities/actions/leave_voice_action')} LeaveVoiceAction */

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

    /**
     * VC退出アクションを投稿
     *
     * @param {LeaveVoiceAction} action VC退出アクション
     * @returns {Promise<void>}
     */
    async postLeaveVoice(action) {}
}

module.exports = IDiscordVcActionRepo;

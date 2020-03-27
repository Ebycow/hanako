const Interface = require('../../core/interface');

/** @typedef {import('../entity/actions/join_voice_action')} JoinVoiceAction */
/** @typedef {import('../entity/actions/leave_voice_action')} LeaveVoiceAction */
/** @typedef {import('../entity/actions/seibai_action')} SeibaiAction */

/**
 * Discordボイスチャット関連アクションのリポジトリ
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

    /**
     * 成敗アクションを投稿
     *
     * @param {SeibaiAction} action 成敗アクション
     * @returns {Promise<void>}
     */
    async postSeibai(action) {}
}

module.exports = IDiscordVcActionRepo;

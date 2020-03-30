const path = require('path');
const logger = require('log4js').getLogger(path.basename(__filename));
const assert = require('assert').strict;
const uuid = require('uuidv4').uuid;
const errors = require('../core/errors').promises;
const LeaveVoiceAction = require('../domain/entity/actions/leave_voice_action');
const ActionHandler = require('../domain/service/action_handler');

/** @typedef {import('../domain/model/hanako')} Hanako */

/**
 * アプリケーションサービス
 * 花子をボイスチャットから自動退出
 */
class AutoLeaveService {
    /**
     * @param {null} actionHandler Domain Service
     */
    constructor(actionHandler = null) {
        this.actionHandler = actionHandler || new ActionHandler();
    }

    /**
     * ボイスチャットに誰もいないとき花子を退出させる
     * - ボイスチャットに花子がいない時 errors.disappointed
     * - 他にまだ誰か残っている時 errors.abort
     *
     * @param {Hanako} hanako 読み上げ花子モデル
     * @param {object} data
     * @param {string} data.serverName 対象Discordサーバー名
     * @param {string} data.voiceChannelName 対象音声チャンネル名
     * @param {Array<string>} data.voiceChannelMembersId 対象音声チャンネルに参加しているユーザーIDの配列
     * @returns {Promise<void>}
     */
    async serve(hanako, data) {
        assert(typeof hanako === 'object');
        assert(typeof data.serverName === 'string');
        assert(typeof data.voiceChannelName === 'string');
        assert(typeof data.voiceChannelMembersId === 'object' && Array.isArray(data.voiceChannelMembersId));
        assert(data.voiceChannelMembersId.every(id => typeof id === 'string'));

        // 花子が残っていないなら errors.disappointed
        if (data.voiceChannelMembersId.every(id => id !== hanako.userId)) {
            return errors.disappointed(`hanako-does-not-exist ${data}`);
        }

        // 花子以外にも誰か残っているなら中止
        if (data.voiceChannelMembersId.some(id => id !== hanako.userId)) {
            return errors.abort();
        }

        // VC退出アクションを実行
        const action = new LeaveVoiceAction({
            id: uuid(),
            serverId: hanako.serverId,
        });
        await this.actionHandler.handle(action);

        // ログ出力して終了
        logger.info(`誰もいないので退出した。[${data.serverName}] ${data.voiceChannelName}`);
        return Promise.resolve();
    }
}

module.exports = AutoLeaveService;

const path = require('path');
const logger = require('log4js').getLogger(path.basename(__filename));
const Injector = require('../core/injector');
const RecoveryInfo = require('../domain/entity/recovery_info');
const LeaveVoiceAction = require('../domain/entity/actions/leave_voice_action');
const IVoiceStatusRepo = require('../domain/repo/i_voice_status_repo');
const IDiscordVcActionRepo = require('../domain/repo/i_discord_vc_action_repo');
const IRecoveryInfoRepo = require('../domain/repo/i_recovery_info_repo');
const IShutdownDelegator = require('../domain/service/i_shutdown_delegator');
const ActionHandler = require('../domain/service/action_handler');

/** @typedef {import('../domain/entity/voice_status')} VoiceStatus */

/**
 * 音声ステータスからVC退出アクションを生成
 *
 * @param {VoiceStatus} voiceStatus
 * @returns {LeaveVoiceAction}
 */
function toLeaveVoiceAction(voiceStatus) {
    return new LeaveVoiceAction({
        id: voiceStatus.id,
        serverId: voiceStatus.serverId,
    });
}

/**
 * 音声ステータスからボイスチャット復帰情報を生成
 *
 * @param {VoiceStatus} voiceStatus
 * @returns {RecoveryInfo}
 */
function toRecoveryInfo(voiceStatus) {
    return new RecoveryInfo({
        id: voiceStatus.id,
        serverId: voiceStatus.serverId,
        voiceChannelId: voiceStatus.voiceChannelId,
        readingChannelsId: voiceStatus.readingChannelsId,
    });
}

/**
 * アプリケーションサービス
 * ボイスチャット復帰を監督
 */
class RecoverySupervisor {
    /**
     * @param {null} voiceStatusRepo DI
     * @param {null} vcActionRepo DI
     * @param {null} recoveryInfoRepo DI
     * @param {null} shutdownDelegator DI Domain Service
     * @param {null} actionHandler Domain Service
     */
    constructor(
        voiceStatusRepo = null,
        vcActionRepo = null,
        recoveryInfoRepo = null,
        shutdownDelegator = null,
        actionHandler = null
    ) {
        this.voiceStatusRepo = voiceStatusRepo || Injector.resolve(IVoiceStatusRepo);
        this.vcActionRepo = vcActionRepo || Injector.resolve(IDiscordVcActionRepo);
        this.recoveryInfoRepo = recoveryInfoRepo || Injector.resolve(IRecoveryInfoRepo);
        this.shutdownDelegator = shutdownDelegator || Injector.resolve(IShutdownDelegator);
        this.actionHandler = actionHandler || new ActionHandler();
    }

    /**
     * ボイスチャット復帰情報の保存処理を登録
     *
     * @returns {Promise<void>}
     */
    async supervise() {
        // 終了前処理にボイスチャット復帰情報の保存処理を登録
        this.shutdownDelegator.delegate(async () => {
            // 現在接続している全てのボイスチャット情報を取得
            const vss = await this.voiceStatusRepo.loadAllVoiceStatus();

            // ボイスチャット情報をVC退出アクションに変換
            const actions = vss.map(toLeaveVoiceAction);

            // VC退出アクションを実行
            const actionPs = actions.map(action => this.actionHandler.handle(action));
            await Promise.all(actionPs.map(p => p.catch(e => logger.warn(`VC退出処理中にエラー ${e}`))));

            // ボイスチャット情報を復帰情報に変換
            const infos = vss.map(toRecoveryInfo);

            // 復帰情報を保存
            const promises = infos.map(info => this.recoveryInfoRepo.saveRecoveryInfo(info));
            await Promise.all(promises);

            // 保存件数をログ出力
            if (infos.length > 0) {
                logger.info(`${infos.length}件のボイスチャット復帰情報を保存しました。`);
            }
        });

        return Promise.resolve();
    }
}

module.exports = RecoverySupervisor;

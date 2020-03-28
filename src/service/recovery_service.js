const path = require('path');
const logger = require('log4js').getLogger(path.basename(__filename));
const uuid = require('uuidv4').uuid;
const Injector = require('../core/injector');
const JoinVoiceAction = require('../domain/entity/actions/join_voice_action');
const ChatResponse = require('../domain/entity/responses/chat_response');
const IRecoveryInfoRepo = require('../domain/repo/i_recovery_info_repo');
const IServerStatusRepo = require('../domain/repo/i_server_status_repo');
const IDiscordChatRepo = require('../domain/repo/i_discord_chat_repo');
const ActionHandler = require('../domain/service/action_handler');

/** @typedef {import('../domain/entity/recovery_info')} RecoveryInfo */

/**
 * アプリケーションサービス
 * ボイスチャット復帰処理サービス
 */
class RecoveryService {
    /**
     * @param {null} recoveryInfoRepo DI
     * @param {null} serverStatusRepo DI
     * @param {null} chatRepo DI
     * @param {null} actionHandler Domain Service
     */
    constructor(recoveryInfoRepo = null, serverStatusRepo = null, chatRepo = null, actionHandler = null) {
        this.recoveryInfoRepo = recoveryInfoRepo || Injector.resolve(IRecoveryInfoRepo);
        this.serverStatusRepo = serverStatusRepo || Injector.resolve(IServerStatusRepo);
        this.chatRepo = chatRepo || Injector.resolve(IDiscordChatRepo);
        this.actionHandler = actionHandler || new ActionHandler();
    }

    /**
     * ボイスチャット復帰処理
     *
     * @returns {Promise<void>}
     */
    async serve() {
        // 復帰情報をすべて取得
        const infos = await this.recoveryInfoRepo.loadAllRecoveryInfo();

        // 復帰処理を実行
        const promises = infos
            .map(info => doRecoveryF.call(this, info))
            .map(p => p.catch(e => logger.warn(`復帰処理中のエラー ${e}`)));
        await Promise.all(promises);

        // 復帰情報をすべて削除
        await this.recoveryInfoRepo.deleteAllRecoveryInfo();

        // 処理完了
        return Promise.resolve();
    }
}

/**
 * (private) 復帰情報に基づいて復帰処理を実行
 *
 * @this {RecoveryService}
 * @param {RecoveryInfo} info 復帰情報
 * @returns {Promise<void>}
 */
async function doRecoveryF(info) {
    // サーバーステータスを取得
    const serverStatus = await this.serverStatusRepo.loadServerStatus(info.serverId);
    logger.info(`ボイスチャット復帰処理を実行 [${serverStatus.serverName}]`);

    // 復帰前チャットを送信
    const startingChat = new ChatResponse({
        id: uuid(),
        content: `<@${serverStatus.userId}> は再接続を試みています。ふごにゃ～んごろごろんみゅ……`,
        channelId: info.readingChannelsId[0],
        code: 'simple',
    });
    await this.chatRepo.postChat(startingChat);

    // ボイスチャット復帰
    const action = new JoinVoiceAction({
        id: uuid(),
        voiceChannelId: info.voiceChannelId,
        textChannelId: info.readingChannelsId[0],
    });
    await this.actionHandler.handle(action);

    // 復帰後チャットを送信
    const endingChat = new ChatResponse({
        id: uuid(),
        content: `<#${info.readingChannelsId[0]}> の読み上げを再開しました。よろしくね！`,
        channelId: info.readingChannelsId[0],
        code: 'simple',
    });
    await this.chatRepo.postChat(endingChat);

    return Promise.resolve();
}

module.exports = RecoveryService;

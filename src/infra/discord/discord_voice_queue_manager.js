const path = require('path');
const logger = require('log4js').getLogger(path.basename(__filename));
const assert = require('assert').strict;
const uuid = require('uuidv4').uuid;
const discord = require('discord.js');
const errors = require('../../core/errors').promises;
const VoiceStatus = require('../../domain/entity/voice_status');
const IVoiceStatusRepo = require('../../domain/repo/i_voice_status_repo');
const IDiscordVoiceRepo = require('../../domain/repo/i_discord_voice_repo');
const IDiscordVcActionRepo = require('../../domain/repo/i_discord_vc_action_repo');
const DiscordVoiceChatModel = require('./discord_voice_chat_model');

const { ChannelType } = require('discord.js');

/** @typedef {import('stream').Readable} Readable */
/** @typedef {import('../../domain/entity/actions/join_voice_action')} JoinVoiceAction */
/** @typedef {import('../../domain/entity/actions/leave_voice_action')} LeaveVoiceAction */
/** @typedef {import('../../domain/entity/actions/seibai_action')} SeibaiAction */
/** @typedef {import('../../domain/entity/responses/voice_response')} VoiceResponse */

/** @typedef {string} ServerID サーバーID */

/**
 * VoiceChatモデルのキャッシュ
 *
 * @type {Map<string, DiscordVoiceChatModel>}
 */
let cache;

/**
 * モジュールの初回呼び出しフラグ
 *
 * @type {boolean}
 */
let firstCall = true;

/**
 * モジュールの初期化（実際にこの実装がDIされるまで初期化処理を遅延させる）
 */
function init() {
    // キャッシュ領域の割当
    cache = new Map();

    logger.trace('モジュールが初期化された');
}

/**
 * ボイスチャットモデルから音声ステータスを生成
 *
 * @param {DiscordVoiceChatModel} vcModel
 * @return {VoiceStatus}
 */
function toVoiceStatus(vcModel) {
    console.log(vcModel.connection);
    return new VoiceStatus({
        id: uuid(),
        serverId: vcModel.serverId,
        state: vcModel.dispatcher === null ? 'ready' : 'speaking',
        voiceChannelId: vcModel.connection.joinConfig.channelId,
        readingChannelsId: vcModel.readingChannels.map(c => c.id),
    });
}

/**
 * Discord音声送信キューマネージャ
 *
 * @implements {IVoiceStatusRepo}
 * @implements {IDiscordVoiceRepo}
 * @implements {IDiscordVcActionRepo}
 */
class DiscordVoiceQueueManager {
    /**
     * DIコンテナ用コンストラクタ
     * 初回呼び出し時にはモジュール初期化を行う
     *
     * @param {discord.Client} client DI
     */
    constructor(client) {
        if (firstCall) {
            firstCall = false;
            init();
        }
        this.client = client;
    }

    /**
     * (impl) IVoiceStatusRepo
     *
     * @param {string} serverId
     * @returns {Promise<VoiceStatus>|Promise<null>}
     */
    async loadVoiceStatus(serverId) {
        assert(typeof serverId === 'string');

        // キャッシュデータがない ⇔ VC未初期化(起動から一度も参加してない)
        if (!cache.has(serverId)) {
            return Promise.resolve(null);
        }

        const vc = cache.get(serverId);

        // VC接続がない ⇔ 今は参加していない
        if (vc.connection === null) {
            return Promise.resolve(null);
        }

        // 新規音声ステータスを生成
        const voiceStatus = toVoiceStatus(vc);

        // 音声ステータスを返却
        return Promise.resolve(voiceStatus);
    }

    /**
     * (impl) IVoiceStatusRepo
     *
     * @returns {Promise<Array<VoiceStatus>>}
     */
    async loadAllVoiceStatus() {
        let vcModels = Array.from(cache.values());
        // 接続していないものを除外
        vcModels = vcModels.filter(vc => vc.connection !== null);
        return Promise.resolve(vcModels.map(toVoiceStatus));
    }

    /**
     * (impl) IDiscordVcActionRepo
     *
     * @param {JoinVoiceAction} action
     * @returns {Promise<void>}
     */
    async postJoinVoice(action) {
        assert(typeof action === 'object');

        // 音声チャネルの実体を取得
        const voiceChannel = this.client.channels.resolve(action.voiceChannelId);

        if (!voiceChannel || voiceChannel.type !== ChannelType.GuildVoice) {
            return errors.unexpected(`no-such-voice-channel ${action}`);
        }

        // テキストチャネルの実体を取得
        const textChannel = this.client.channels.resolve(action.textChannelId);
        if (!textChannel || textChannel.type !== ChannelType.GuildText) {
            return errors.unexpected(`no-such-text-channel ${action}`);
        }

        const serverId = voiceChannel.guild.id;

        // VCモデルをキャッシュから取得または新規追加
        let vc;
        if (cache.has(serverId)) {
            vc = cache.get(serverId);
        } else {
            vc = new DiscordVoiceChatModel(serverId);
            cache.set(serverId, vc);
        }

        // VCに参加
        await vc.join(voiceChannel);

        // 読み上げチャネルに追加
        vc.addReadingChannel(textChannel);

        return Promise.resolve();
    }

    /**
     * (impl) IDiscordVcActionRepo
     *
     * @param {LeaveVoiceAction} action
     * @returns {Promise<void>}
     */
    async postLeaveVoice(action) {
        assert(typeof action === 'object');

        if (!cache.has(action.serverId)) {
            return errors.unexpected(`leave-voice-before-join ${action}`);
        }

        const vc = cache.get(action.serverId);

        // VCから退出
        vc.leave();

        return Promise.resolve();
    }

    /**
     * (impl) IDiscordVcActionRepo
     *
     * @param {SeibaiAction} action
     * @returns {Promise<void>}
     */
    async postSeibai(action) {
        assert(typeof action === 'object');

        if (!cache.has(action.serverId)) {
            return errors.unexpected(`seibai-before-join ${action}`);
        }

        const vc = cache.get(action.serverId);

        // キューを空にする
        vc.clearQueue();

        // Dispatcherを〆る
        await vc.killStream();

        return Promise.resolve();
    }

    /**
     * (impl) IDiscordVoiceRepo
     *
     * @param {VoiceResponse} voice
     * @param {Promise<void>}
     */
    async postVoice(voice) {
        assert(typeof voice === 'object');

        if (!cache.has(voice.serverId)) {
            voice.stream.destroy();
            return errors.unexpected(`post-before-initialization ${voice}`);
        }

        const vc = cache.get(voice.serverId);

        // VCに参加していない場合
        if (vc.connection === null) {
            voice.stream.destroy();
            logger.warn(`音声ストリームを受け取ったがVCにいなかった ${voice}`);
            return errors.abort();
        }

        // キューに追加
        vc.push(voice.stream);

        return Promise.resolve();
    }
}

// IVoiceStatusRepoの実装として登録
IVoiceStatusRepo.comprise(DiscordVoiceQueueManager, [discord.Client]);

// IDiscordVoiceRepoの実装として登録
IDiscordVoiceRepo.comprise(DiscordVoiceQueueManager, [discord.Client]);

// IDiscordVcActionRepoの実装として登録
IDiscordVcActionRepo.comprise(DiscordVoiceQueueManager, [discord.Client]);

module.exports = DiscordVoiceQueueManager;

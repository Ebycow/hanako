const path = require('path');
const logger = require('log4js').getLogger(path.basename(__filename));
const assert = require('assert').strict;
const discord = require('discord.js');
const errors = require('../../core/errors').promises;
const Injector = require('../../core/injector');
const IDiscordVoiceRepo = require('../../domain/repo/i_discord_voice_repo');
const IDiscordVcActionRepo = require('../../domain/repo/i_discord_vc_action_repo');
const DiscordVoiceChatModel = require('./discord_voice_chat_model');

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
 * ディスコード音声送信キューマネージャ
 *
 * @implements {IDiscordVoiceRepo}
 * @implements {IDiscordVcActionRepo}
 */
class DiscordVoiceQueueManager {
    /**
     * DIコンテナ用コンストラクタ
     * 初回呼び出し時にはモジュール初期化を行う
     *
     * @param {null} client DI
     */
    constructor(client = null) {
        if (firstCall) {
            firstCall = false;
            init();
        }
        this.client = client || Injector.resolveSingleton(discord.Client);
    }

    // TODO FIXME
    getVoiceChatModel(serverId) {
        return cache.get(serverId);
    }

    /**
     * (impl) IDiscordVcActionRepo
     *
     * @param {JoinVoiceAction} action
     * @returns {Promise<void>}
     */
    async postJoinVoice(action) {
        assert(typeof action === 'object');

        const voiceChannel = this.client.channels.resolve(action.voiceChannelId);
        if (!voiceChannel || !(voiceChannel instanceof discord.VoiceChannel)) {
            return errors.unexpected(`no-such-voice-channel ${action}`);
        }

        const textChannel = this.client.channels.resolve(action.textChannelId);
        if (!textChannel || !(textChannel instanceof discord.TextChannel)) {
            return errors.unexpected(`no-such-text-channel ${action}`);
        }

        const GID = voiceChannel.guild.id;
        let vc = cache.get(GID);
        if (!vc) {
            vc = new DiscordVoiceChatModel();
            cache.set(GID, vc);
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

        const vc = cache.get(action.serverId);
        if (!vc) {
            return errors.unexpected(`leave-voice-before-join ${action}`);
        }

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

        const vc = cache.get(action.serverId);
        if (!vc) {
            return errors.unexpected(`seibai-before-join ${action}`);
        }

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

        const vc = cache.get(voice.serverId);
        if (!vc) {
            voice.stream.destroy();
            return errors.unexpected(`post-before-initialization ${voice}`);
        }

        if (vc.connection === null) {
            // VCにいない
            voice.stream.destroy();
            logger.warn(`音声ストリームを受け取ったがVCにいなかった ${voice}`);
            return errors.abort();
        }

        // キューに追加
        vc.push(voice.stream);
    }
}

// IDiscordVoiceRepoの実装として登録
IDiscordVoiceRepo.comprise(DiscordVoiceQueueManager);

// IDiscordVcActionRepoの実装として登録
IDiscordVcActionRepo.comprise(DiscordVoiceQueueManager);

module.exports = DiscordVoiceQueueManager;

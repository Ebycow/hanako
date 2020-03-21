const path = require('path');
const logger = require('log4js').getLogger(path.basename(__filename));
const assert = require('assert').strict;
const discord = require('discord.js');
const errors = require('../../core/errors').promises;
const Injector = require('../../core/injector');
const IDiscordVoiceRepo = require('../../domain/repos/i_discord_voice_repo');
const IDiscordVcActionRepo = require('../../domain/repos/i_discord_vc_action_repo');
const VoiceChatModel = require('./voice_chat_model');

/** @typedef {import('stream').Readable} Readable */
/** @typedef {import('../../domain/entities/actions/join_voice_action')} VoiceJoinAction */
/** @typedef {import('../../domain/entities/responses/voice_response')} VoiceResponse */

/** @type {Map<string, VoiceChatModel>} */
let cache;

let firstCall = true;
function init() {
    if (firstCall) {
        firstCall = false;
        cache = new Map();
    }
}

class DiscordVoiceQueueManager {
    constructor() {
        init();
        this.client = Injector.resolveSingleton(discord.Client);
    }

    getVoiceChatModel(serverId) {
        return cache.get(serverId);
    }

    /**
     *
     * @param {VoiceJoinAction} action
     */
    async postJoinVoice(action) {
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
            vc = new VoiceChatModel();
            cache.set(GID, vc);
        }

        // VCに参加
        await vc.join(voiceChannel);

        // 読み上げチャネルに追加
        vc.addReadingChannel(textChannel);
    }

    /**
     *
     * @param {VoiceResponse} voice
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

IDiscordVoiceRepo.comprise(DiscordVoiceQueueManager);

IDiscordVcActionRepo.comprise(DiscordVoiceQueueManager);

module.exports = DiscordVoiceQueueManager;

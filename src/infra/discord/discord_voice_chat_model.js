const assert = require('assert').strict;
const path = require('path');
const logger = require('log4js').getLogger(path.basename(__filename));

const {
    joinVoiceChannel,
    createAudioPlayer,
    createAudioResource,
    NoSubscriberBehavior,
    StreamType,
    AudioPlayerStatus,
    VoiceConnectionStatus,
    entersState,
} = require('@discordjs/voice');

const VOICE_RECOVERY_WAIT_MS = 5000;
const VOICE_READY_WAIT_MS = 20000;
const RECONNECT_BASE_DELAY_MS = 30000;
const RECONNECT_MAX_DELAY_MS = 300000;

/** @typedef {import('stream').Readable} Readable */
/** @typedef {import('discord.js').VoiceChannel} discord.VoiceChannel */
/** @typedef {import('discord.js').TextChannel} discord.TextChannel*/
/** @typedef {import('@discordjs/voice').VoiceConnection} VoiceConnection */
/** @typedef {import('@discordjs/voice').AudioPlayer} AudioPlayer */
/** @typedef {import('@discordjs/voice').PlayerSubscription} PlayerSubscription */

class DiscordVoiceChatModel {
    /**
     * @param {string} serverId Discord server ID
     */
    constructor(serverId) {
        assert(typeof serverId === 'string');

        /**
         * @type {string}
         */
        this.serverId = serverId;

        /**
         * @type {Readable[]}
         */
        this.cue = [];

        /**
         * @type {VoiceConnection | null}
         */
        this.connection = null;

        /**
         * Last joined voice channel. Used to recreate the connection after Discord voice recovery fails.
         *
         * @type {discord.VoiceChannel | null}
         */
        this.voiceChannel = null;

        /**
         * @type {AudioPlayer | null}
         */
        this.audioPlayer = null;

        /**
         * @type {PlayerSubscription | null}
         */
        this.playerSubscribe = null;

        /**
         * @type {object | null}
         */
        this.dispatcher = null;

        /**
         * @type {discord.TextChannel[]}
         */
        this.readingChannels = [];

        /**
         * @type {NodeJS.Timeout | null}
         */
        this.reconnectTimer = null;

        /**
         * @type {number}
         */
        this.reconnectAttempts = 0;

        /**
         * @type {boolean}
         */
        this.reconnecting = false;
    }

    clearQueue() {
        this.cue.forEach((stream) => stream.destroy());
        this.cue = [];
    }

    clearReadingChannels() {
        this.readingChannels = [];
    }

    /**
     * @param {discord.TextChannel} textChannel
     */
    addReadingChannel(textChannel) {
        if (!this.readingChannels.some((channel) => channel.id === textChannel.id)) {
            this.readingChannels.push(textChannel);
        }
    }

    /**
     * @returns {Promise<void>}
     */
    killStream() {
        return new Promise((resolve) => {
            if (this.dispatcher !== null && this.audioPlayer !== null) {
                this.audioPlayer.stop();
                this.dispatcher = null;
            }
            resolve();
        });
    }

    /**
     * @param {discord.VoiceChannel} voiceChannel
     * @returns {Promise<void>}
     */
    async join(voiceChannel) {
        this.cancelReconnect();
        this.voiceChannel = voiceChannel;
        this.reconnectAttempts = 0;
        this.clearReadingChannels();
        this.clearQueue();
        await this.killStream();
        this.destroyConnection(this.connection);
        this.connect(voiceChannel);
    }

    /**
     * @param {discord.VoiceChannel} voiceChannel
     * @returns {VoiceConnection}
     * @private
     */
    connect(voiceChannel) {
        const connection = joinVoiceChannel({
            channelId: voiceChannel.id,
            guildId: voiceChannel.guildId,
            adapterCreator: voiceChannel.guild.voiceAdapterCreator,
        });
        const audioPlayer = createAudioPlayer({
            behaviors: {
                noSubscriber: NoSubscriberBehavior.Stop,
            },
        });

        this.connection = connection;
        this.audioPlayer = audioPlayer;
        this.playerSubscribe = connection.subscribe(audioPlayer);
        this.dispatcher = null;

        audioPlayer.on('error', (error) => {
            if (audioPlayer !== this.audioPlayer) return;
            logger.error('Audio player error:', error);
            this.dispatcher = null;
            this.play();
        });

        connection.on('stateChange', async (_oldState, newState) => {
            await this.handleConnectionStateChange(connection, newState);
        });

        connection.on('error', (err) => {
            if (connection !== this.connection) return;
            logger.warn(`Voice connection error (server: ${this.serverId})`, err);
        });

        return connection;
    }

    /**
     * @param {VoiceConnection} connection
     * @param {{status: string}} newState
     * @returns {Promise<void>}
     * @private
     */
    async handleConnectionStateChange(connection, newState) {
        if (connection !== this.connection || newState.status !== VoiceConnectionStatus.Disconnected) {
            return;
        }

        logger.warn(`Voice connection disconnected (server: ${this.serverId})`);

        try {
            await Promise.race([
                entersState(connection, VoiceConnectionStatus.Signalling, VOICE_RECOVERY_WAIT_MS),
                entersState(connection, VoiceConnectionStatus.Connecting, VOICE_RECOVERY_WAIT_MS),
            ]);
            if (connection !== this.connection) return;

            logger.info(`Voice connection automatic recovery detected (server: ${this.serverId})`);
            await entersState(connection, VoiceConnectionStatus.Ready, VOICE_READY_WAIT_MS);
            if (connection !== this.connection) return;

            logger.info(`Voice connection recovered to Ready (server: ${this.serverId})`);
        } catch {
            if (connection !== this.connection) return;

            try {
                logger.info(`Voice connection rejoin requested (server: ${this.serverId})`);
                connection.rejoin();
                await entersState(connection, VoiceConnectionStatus.Ready, VOICE_READY_WAIT_MS);
                if (connection !== this.connection) return;

                logger.info(`Voice connection rejoin succeeded (server: ${this.serverId})`);
            } catch {
                if (connection !== this.connection) return;

                logger.error(`Voice connection recovery failed; destroying connection (server: ${this.serverId})`);
                this.clearQueue();
                this.destroyConnection(connection);
                this.scheduleReconnect();
            }
        }
    }

    leave() {
        this.cancelReconnect();
        this.voiceChannel = null;
        this.clearReadingChannels();
        this.clearQueue();
        this.destroyConnection(this.connection);
    }

    /**
     * @param {Readable} stream
     */
    push(stream) {
        this.cue.push(stream);
        if (this.connection !== null && this.dispatcher === null) {
            this.play();
        }
    }

    /**
     * @param {VoiceConnection | null} connection
     * @private
     */
    destroyConnection(connection) {
        if (connection === null) {
            return;
        }

        if (connection !== this.connection) {
            try {
                connection.destroy();
            } catch {
                // Ignore stale connection cleanup errors.
            }
            return;
        }

        if (this.playerSubscribe !== null) {
            try {
                this.playerSubscribe.unsubscribe();
            } catch {
                // Ignore unsubscribe cleanup errors.
            }
            this.playerSubscribe = null;
        }

        if (this.audioPlayer !== null) {
            try {
                this.audioPlayer.stop();
            } catch {
                // Ignore player cleanup errors.
            }
            this.audioPlayer = null;
        }

        this.dispatcher = null;
        this.connection = null;
        try {
            connection.destroy();
        } catch {
            // Ignore destroy cleanup errors.
        }
    }

    /**
     * @private
     */
    cancelReconnect() {
        if (this.reconnectTimer !== null) {
            clearTimeout(this.reconnectTimer);
            this.reconnectTimer = null;
        }
        this.reconnecting = false;
    }

    /**
     * @private
     */
    scheduleReconnect() {
        if (
            this.voiceChannel === null ||
            this.connection !== null ||
            this.reconnectTimer !== null ||
            this.reconnecting
        ) {
            return;
        }

        const delay = Math.min(RECONNECT_BASE_DELAY_MS * 2 ** this.reconnectAttempts, RECONNECT_MAX_DELAY_MS);
        this.reconnectAttempts++;

        logger.info(`Voice connection reconnect scheduled (server: ${this.serverId}, delay: ${delay}ms)`);
        this.reconnectTimer = setTimeout(() => {
            this.reconnectTimer = null;
            this.reconnect();
        }, delay);
        if (typeof this.reconnectTimer.unref === 'function') {
            this.reconnectTimer.unref();
        }
    }

    /**
     * @returns {Promise<void>}
     * @private
     */
    async reconnect() {
        if (this.voiceChannel === null || this.connection !== null || this.reconnecting) {
            return;
        }

        this.reconnecting = true;
        let connection = null;
        let shouldRetry = false;
        try {
            logger.info(`Voice connection reconnecting (server: ${this.serverId})`);
            connection = this.connect(this.voiceChannel);
            await entersState(connection, VoiceConnectionStatus.Ready, VOICE_READY_WAIT_MS);
            if (connection !== this.connection) return;

            this.reconnectAttempts = 0;
            logger.info(`Voice connection reconnected (server: ${this.serverId})`);
            this.play();
        } catch (e) {
            logger.warn(`Voice connection reconnect failed (server: ${this.serverId})`, e);
            this.destroyConnection(connection);
            shouldRetry = this.voiceChannel !== null && this.connection === null;
        } finally {
            this.reconnecting = false;
        }

        if (shouldRetry) {
            this.scheduleReconnect();
        }
    }

    /**
     * @private
     */
    play() {
        const stream = this.cue.shift();
        if (stream && this.connection && this.audioPlayer) {
            const connection = this.connection;
            const audioPlayer = this.audioPlayer;
            setImmediate(() => {
                if (connection !== this.connection || audioPlayer !== this.audioPlayer) {
                    stream.destroy();
                    this.dispatcher = null;
                    return;
                }

                logger.debug('Creating audio resource for stream');
                const resource = createAudioResource(stream, {
                    inputType: StreamType.Raw,
                });

                logger.debug('Playing audio resource');
                audioPlayer.play(resource);

                this.dispatcher = resource;

                audioPlayer.once(AudioPlayerStatus.Idle, () => {
                    if (audioPlayer !== this.audioPlayer) return;
                    logger.debug('Audio playback idle, playing next');
                    this.dispatcher = null;
                    this.play();
                });
            });
        } else {
            this.dispatcher = null;
        }
    }
}

module.exports = DiscordVoiceChatModel;

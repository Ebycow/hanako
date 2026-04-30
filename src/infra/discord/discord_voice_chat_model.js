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

/**
 * Discordボイスチャットの境界モデル
 */
class DiscordVoiceChatModel {
    /**
     * DiscordVoiceChatModelを構築
     *
     * @param {string} serverId DiscordサーバーID
     */
    constructor(serverId) {
        assert(typeof serverId === 'string');

        /**
         * 所属するDiscordサーバーのID
         *
         * @type {string}
         */
        this.serverId = serverId;

        /**
         * 音声ストリーム待ち行列
         *
         * @type {Readable[]}
         */
        this.cue = [];

        /**
         * 音声チャンネルとのコネクション
         *
         * @type {VoiceConnection | null}
         */
        this.connection = null;

        /**
         * 最後に参加した音声チャンネル
         * rejoin失敗後に新しい音声接続を作り直すために保持する。
         *
         * @type {discord.VoiceChannel | null}
         */
        this.voiceChannel = null;

        /**
         * 音声チャンネルのオーディオプレイヤー
         *
         * @type {AudioPlayer | null}
         */
        this.audioPlayer = null;

        /**
         * 音声チャンネルのサブスクライブ
         *
         * @type {PlayerSubscription | null}
         */
        this.playerSubscribe = null;

        /**
         * 現在再生中のストリームのDispatcher
         *
         * @type {object | null}
         */
        this.dispatcher = null;

        /**
         * 現在読み上げ中のテキストチャンネルの配列
         *
         * @type {discord.TextChannel[]}
         */
        this.readingChannels = [];

        /**
         * 再接続タイマー
         *
         * @type {NodeJS.Timeout | null}
         */
        this.reconnectTimer = null;

        /**
         * 再接続試行回数
         *
         * @type {number}
         */
        this.reconnectAttempts = 0;

        /**
         * 再接続処理中フラグ
         *
         * @type {boolean}
         */
        this.reconnecting = false;
    }

    /**
     * キューを空にする
     */
    clearQueue() {
        this.cue.forEach((stream) => stream.destroy());
        this.cue = [];
    }

    /**
     * 読み上げ対象チャネルを空にする
     */
    clearReadingChannels() {
        this.readingChannels = [];
    }

    /**
     * 読み上げ対象チャネルを追加する
     *
     * @param {discord.TextChannel} textChannel 読み上げ対象チャネル
     */
    addReadingChannel(textChannel) {
        if (!this.readingChannels.some((channel) => channel.id === textChannel.id)) {
            this.readingChannels.push(textChannel);
        }
    }

    /**
     * 現在再生中の音声を強制的に中止する
     *
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
     * VCに参加する
     *
     * @param {discord.VoiceChannel} voiceChannel 参加するチャンネル。
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
     * Discord音声接続とAudioPlayerを作る。
     * 古い接続のイベントが新しい接続を破棄しないよう、呼び出し側で接続インスタンスを保持して比較する。
     *
     * @param {discord.VoiceChannel} voiceChannel 参加するチャンネル。
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
            logger.warn(`音声接続エラー (server: ${this.serverId})`, err);
        });

        return connection;
    }

    /**
     * 音声接続の切断を検知して復帰を試みる。
     *
     * @param {VoiceConnection} connection
     * @param {{status: string}} newState
     * @returns {Promise<void>}
     * @private
     */
    async handleConnectionStateChange(connection, newState) {
        if (connection !== this.connection || newState.status !== VoiceConnectionStatus.Disconnected) {
            return;
        }

        logger.warn(`音声接続が切断された (server: ${this.serverId})`);

        try {
            // discord.js内部の自動復帰（Signalling/Connecting状態への遷移）を待つ
            await Promise.race([
                entersState(connection, VoiceConnectionStatus.Signalling, VOICE_RECOVERY_WAIT_MS),
                entersState(connection, VoiceConnectionStatus.Connecting, VOICE_RECOVERY_WAIT_MS),
            ]);
            if (connection !== this.connection) return;

            logger.info(`音声接続の自動復帰を検知 (server: ${this.serverId})`);
            await entersState(connection, VoiceConnectionStatus.Ready, VOICE_READY_WAIT_MS);
            if (connection !== this.connection) return;

            logger.info(`音声接続がReady状態に復帰 (server: ${this.serverId})`);
        } catch {
            if (connection !== this.connection) return;

            try {
                // 自動復帰しなかった場合、手動でrejoinを試みる
                logger.info(`音声接続のrejoinを試行 (server: ${this.serverId})`);
                connection.rejoin();
                await entersState(connection, VoiceConnectionStatus.Ready, VOICE_READY_WAIT_MS);
                if (connection !== this.connection) return;

                logger.info(`音声接続のrejoinに成功 (server: ${this.serverId})`);
            } catch {
                if (connection !== this.connection) return;

                logger.error(`音声接続の復帰に失敗。接続を破棄する (server: ${this.serverId})`);
                this.clearQueue();
                this.destroyConnection(connection);
                this.scheduleReconnect();
            }
        }
    }

    /**
     * VCから退出する
     */
    leave() {
        this.cancelReconnect();
        this.voiceChannel = null;
        this.clearReadingChannels();
        this.clearQueue();
        this.destroyConnection(this.connection);
    }

    /**
     * 音声ストリームを待ち行列に追加する
     *
     * @param {Readable} stream 音声ストリーム。
     */
    push(stream) {
        this.cue.push(stream);
        if (this.connection !== null && this.dispatcher === null) {
            this.play();
        }
    }

    /**
     * 現在の接続を破棄してクリーンアップする
     *
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
     * 予約中の再接続をキャンセルする
     *
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
     * rejoin失敗後の再接続を予約する
     *
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

        logger.info(`音声接続の再接続を予約 (server: ${this.serverId}, delay: ${delay}ms)`);
        this.reconnectTimer = setTimeout(() => {
            this.reconnectTimer = null;
            this.reconnect();
        }, delay);
        if (typeof this.reconnectTimer.unref === 'function') {
            this.reconnectTimer.unref();
        }
    }

    /**
     * 最後に参加していた音声チャンネルへ新しい接続を作る
     *
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
            logger.info(`音声接続の再接続を試行 (server: ${this.serverId})`);
            connection = this.connect(this.voiceChannel);
            await entersState(connection, VoiceConnectionStatus.Ready, VOICE_READY_WAIT_MS);
            if (connection !== this.connection) return;

            this.reconnectAttempts = 0;
            logger.info(`音声接続の再接続に成功 (server: ${this.serverId})`);
            this.play();
        } catch (e) {
            logger.warn(`音声接続の再接続に失敗 (server: ${this.serverId})`, e);
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
     * 再帰的再生
     *
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

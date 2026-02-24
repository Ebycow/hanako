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

/** @typedef {import('stream').Readable} Readable */
/** @typedef {import('discord.js').VoiceChannel} discord.VoiceChannel */
/** @typedef {import('discord.js').TextChannel} discord.TextChannel*/
/** @typedef {import('discord.js').VoiceConnection} discord.VoiceConnection */
/** @typedef {import('discord.js').StreamDispatcher} discord.StreamDispatcher */
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
         * @type {VoiceConnection}
         */
        this.connection = null;

        /**
         * 音声チャンネルのオーディオプレイヤー
         *
         * @type {AudioPlayer}
         */
        this.audioPlayer = null;

        /**
         * 音声チャンネルのサブスクライブ
         *
         * @type {PlayerSubscription}
         */
        this.playerSubscribe = null;

        /**
         * 現在再生中のストリームのDispatcher
         *
         * @type {discord.StreamDispatcher}
         */
        this.dispatcher = null;

        /**
         * 現在読み上げ中のテキストチャンネルの配列
         *
         * @type {discord.TextChannel[]}
         */
        this.readingChannels = [];
    }

    /**
     * キューを空にする
     */
    clearQueue() {
        this.cue.forEach(stream => stream.destroy());
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
        this.readingChannels.push(textChannel);
    }

    /**
     * 現在再生中の音声を強制的に中止する
     *
     * @returns {Promise<void>}
     */
    killStream() {
        return new Promise(resolve => {
            if (this.dispatcher !== null) {
                this.audioPlayer.stop();
                this.dispatcher = null;
                resolve();
            } else {
                resolve();
            }
        });
    }

    /**
     * VCに参加する
     *
     * @param {discord.VoiceChannel} voiceChannel 参加するチャンネル。
     * @returns {Promise<void>}
     */
    async join(voiceChannel) {
        if (this.connection !== null) {
            this.clearReadingChannels();
            this.clearQueue();
            await this.killStream();
        }

        this.connection = joinVoiceChannel({
            channelId: voiceChannel.id,
            guildId: voiceChannel.guildId,
            adapterCreator: voiceChannel.guild.voiceAdapterCreator,
        });

        // 音声接続の切断を検知して再接続を試みる
        this.connection.on('stateChange', async (_oldState, newState) => {
            if (newState.status === VoiceConnectionStatus.Disconnected) {
                logger.warn(`音声接続が切断された (server: ${this.serverId})`);
                try {
                    // discord.js内部の自動復帰（Signalling/Connecting状態への遷移）を待つ
                    await Promise.race([
                        entersState(this.connection, VoiceConnectionStatus.Signalling, 5000),
                        entersState(this.connection, VoiceConnectionStatus.Connecting, 5000),
                    ]);
                    logger.info(`音声接続の自動復帰を検知 (server: ${this.serverId})`);
                    await entersState(this.connection, VoiceConnectionStatus.Ready, 20000);
                    logger.info(`音声接続がReady状態に復帰 (server: ${this.serverId})`);
                } catch {
                    // 自動復帰しなかった場合、手動でrejoinを試みる
                    try {
                        logger.info(`音声接続のrejoinを試行 (server: ${this.serverId})`);
                        this.connection.rejoin();
                        await entersState(this.connection, VoiceConnectionStatus.Ready, 20000);
                        logger.info(`音声接続のrejoinに成功 (server: ${this.serverId})`);
                    } catch {
                        // rejoinも失敗した場合は接続を破棄してクリーンアップ
                        logger.error(`音声接続の復帰に失敗。接続を破棄する (server: ${this.serverId})`);
                        this.clearQueue();
                        this.clearReadingChannels();
                        this.dispatcher = null;
                        try {
                            this.connection.destroy();
                        } catch {
                            // destroy自体が失敗しても無視
                        }
                        this.connection = null;
                        this.audioPlayer = null;
                        this.playerSubscribe = null;
                    }
                }
            }
        });

        this.connection.on('error', err => {
            logger.warn(`音声接続エラー (server: ${this.serverId})`, err);
        });

        this.audioPlayer = createAudioPlayer();
        this.playerSubscribe = this.connection.subscribe(this.audioPlayer);
    }

    /**
     * VCから退出する
     */
    leave() {
        this.clearReadingChannels();
        this.clearQueue();
        if (this.connection !== null) {
            this.playerSubscribe.unsubscribe();
            this.playerSubscribe = null;

            this.audioPlayer.stop();
            this.audioPlayer = null;

            this.connection.disconnect();
            this.connection = null;
        }
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
     * 再帰的再生
     * @private
     */
    play() {
        const stream = this.cue.shift();
        if (stream && this.connection) {
            setImmediate(() => {
                if (this.connection) {
                    logger.debug('Creating audio resource for stream');
                    const resource = createAudioResource(stream, {
                        inputType: StreamType.Raw,
                    });

                    logger.debug('Playing audio resource');
                    this.audioPlayer.play(resource, {
                        noSubscriber: NoSubscriberBehavior.Stop,
                    });

                    this.dispatcher = resource;

                    this.audioPlayer.once(AudioPlayerStatus.Idle, () => {
                        logger.debug('Audio playback idle, playing next');
                        this.dispatcher = null;
                        this.play();
                    });

                    this.audioPlayer.once('error', error => {
                        logger.error('Audio player error:', error);
                        this.dispatcher = null;
                        this.play();
                    });
                } else {
                    logger.warn('Connection lost during play');
                    this.dispatcher = null;
                }
            });
        } else {
            this.dispatcher = null;
        }
    }
}

module.exports = DiscordVoiceChatModel;

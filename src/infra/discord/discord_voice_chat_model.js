/** @typedef {import('stream').Readable} Readable */
/** @typedef {import('discord.js').VoiceChannel} discord.VoiceChannel */
/** @typedef {import('discord.js').TextChannel} discord.TextChannel*/
/** @typedef {import('discord.js').VoiceConnection} discord.VoiceConnection */
/** @typedef {import('discord.js').StreamDispatcher} discord.StreamDispatcher */

/**
 * Discordボイスチャットの境界モデル
 */
class DiscordVoiceChatModel {
    /**
     * DiscordVoiceChatModelを構築
     */
    constructor() {
        /**
         * 音声ストリーム待ち行列
         *
         * @type {Readable[]}
         */
        this.cue = [];

        /**
         * 音声チャンネルとのコネクション
         *
         * @type {discord.VoiceConnection}
         */
        this.connection = null;

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
                const disp = this.dispatcher;
                disp.emit('finish');
                setImmediate(() => {
                    disp.destroy();
                    resolve();
                });
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
        this.connection = await voiceChannel.join();
    }

    /**
     * VCから退出する
     */
    leave() {
        this.clearReadingChannels();
        this.clearQueue();
        if (this.connection !== null) {
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
                    this.dispatcher = this.connection.play(stream, {
                        type: 'converted',
                        bitrate: 'auto',
                        volume: false,
                        highWaterMark: 64,
                    });
                    this.dispatcher.once('finish', () => this.play());
                } else {
                    this.dispatcher = null;
                }
            });
        } else {
            this.dispatcher = null;
        }
    }
}

module.exports = DiscordVoiceChatModel;

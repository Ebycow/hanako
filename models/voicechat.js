const assert = require('assert').strict;
const { Readable } = require('stream');
const discord = require('discord.js');
const exitHook = require('exit-hook');

class VoiceChat {

    constructor() {

        /**
         * @type {Readable[]}
         * @private
         */
        this.cue = [];

        /**
         * @type {discord.VoiceConnection}
         * @private
         */
        this.connection = null;

        /**
         * @type {discord.StreamDispatcher}
         * @private
         */
        this.dispatcher = null;

    }

    /**
     * @type {boolean}
     */
    get isStreaming() {
        return !!(this.dispatcher);
    }

    /**
     * @type {boolean}
     */
    get isJoined() {
        return !!(this.connection);
    }

    /**
     * @type {number}
     */
    get queueLength() {
        return this.cue.length;
    }

    /**
     * キューを空にします。
     */
    clearQueue() {
        this.cue.forEach(stream => stream.destroy());
        this.cue = [];
    }

    /**
     * 現在再生中の音声を強制的に中止します。
     * @param {string?} 中止する理由。
     * @returns {Promise<void>}
     */
    killStream(reason) {
        return new Promise((resolve) => {
            if (this.dispatcher !== null) {
                this.dispatcher.end(reason);
                setImmediate(() => resolve());
            } else {
                resolve();
            }
        });
    }

    /**
     * VCに参加します。
     * @param {discord.VoiceChannel} voiceChannel 参加するチャンネル。
     * @returns {Promise<void>}
     */
    async join(voiceChannel) {
        if (this.connection !== null) {
            this.clearQueue();
            await this.killStream('joining another voice channel');
        }
        this.connection = await voiceChannel.join();
        const unsub = exitHook(() => this.connection.disconnect());
        this.connection.once('disconnect', _ => unsub());
    }

    /**
     * VCから退出します。
     */
    leave() {
        this.clearQueue();
        if (this.connection !== null) {
            this.connection.disconnect();
            this.connection = null;
        }
    }

    /**
     * 音声ストリームを待ち行列に追加します。
     * @param {Readable} stream 音声ストリーム。
     */
    push(stream) {
        this.cue.push(stream);
        if (this.connection !== null && this.dispatcher === null) {
            this._play();
        }
    }

    /**
     * @private
     */
    _play() {
        const stream = this.cue.shift();
        if (stream && this.connection) {
            setImmediate(() => {
                if (this.connection) {
                    this.dispatcher = this.connection.playConvertedStream(stream, { bitrate: 'auto' });
                    this.dispatcher.on('end', _ => this._play());
                } else {
                    this.dispatcher = null;
                }
            });
        } else {
            this.dispatcher = null;
        }
    }

}

module.exports = {
    VoiceChat
};

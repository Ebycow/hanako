const assert = require('assert').strict;

/** @typedef {import('../entity/server_status')} ServerStatus */
/** @typedef {import('../entity/voice_status')} VoiceStatus */
/** @typedef {import('../entity/word_dictionary') WordDictionary} */

/**
 * ドメインモデル
 * 読み上げ花子
 */
class Hanako {
    /**
     * 読み上げ花子のモデルを構築
     *
     * @param {ServerStatus} serverStatus サーバーステータス
     * @param {VoiceStatus | null} voiceStatus 音声ステータス またはnull
     * @param {WordDictionary} wordDictionary 教育単語辞書
     */
    constructor(serverStatus, voiceStatus, wordDictionary) {
        assert(typeof serverStatus === 'object');
        assert(typeof voiceStatus === 'object');
        assert(typeof wordDictionary === 'object');

        /**
         * 所属Discordサーバーのステータス
         */
        this.serverStatus = serverStatus;
        Object.defineProperty(this, 'serverStatus', { writable: false });

        /**
         * 花子の音声ステータス またはnull
         */
        this.voiceStatus = voiceStatus;
        Object.defineProperty(this, 'voiceStatus', { writable: false });

        /**
         * 花子の教育単語辞書
         */
        this.wordDictionary = wordDictionary;
        Object.defineProperty(this, 'wordDictionary', { writable: false });
    }

    /**
     * 所属DiscordサーバーのID
     */
    get serverId() {
        return this.serverStatus.serverId;
    }

    /**
     * コマンドプリフィクス
     */
    get prefix() {
        return this.serverStatus.prefix;
    }

    /**
     * @param {string} channelId チャンネルID
     * @returns {boolean} 読み上げ対象のチャンネルか否か
     */
    isReadingChannel(channelId) {
        assert(typeof channelId === 'string');

        if (this.voiceStatus === null) {
            return false;
        }
        return this.voiceStatus.readingChannelsId.includes(channelId);
    }

    /**
     * @param {string} text 任意のテキスト
     * @returns {boolean} テキストにコマンドプリフィクスが付いているか否か
     */
    hasCommandPrefix(text) {
        return text.startsWith(this.prefix);
    }
}

module.exports = Hanako;

const assert = require('assert').strict;

/** @typedef {import('../entity/settings')} Settings */
/** @typedef {import('../entity/server_status')} ServerStatus */
/** @typedef {import('../entity/voice_status')} VoiceStatus */
/** @typedef {import('../entity/word_dictionary')} WordDictionary */
/** @typedef {import('../entity/silence_dictionary')} SilenceDictionary */

/**
 * ドメインモデル
 * 読み上げ花子
 */
class Hanako {
    /**
     * 読み上げ花子のモデルを構築
     *
     * @param {Settings} settings 読み上げ花子の設定
     * @param {ServerStatus} serverStatus サーバーステータス
     * @param {VoiceStatus | null} voiceStatus 音声ステータス またはnull
     * @param {WordDictionary} wordDictionary 教育単語辞書
     * @param {SilenceDictionary} silenceDictionary 沈黙ユーザー辞書
     */
    constructor(settings, serverStatus, voiceStatus, wordDictionary, silenceDictionary) {
        assert(typeof settings === 'object');
        assert(typeof serverStatus === 'object');
        assert(typeof voiceStatus === 'object');
        assert(typeof wordDictionary === 'object');
        assert(typeof silenceDictionary === 'object');

        /**
         * 読み上げ花子の設定
         */
        this.settings = settings;
        Object.defineProperty(this, 'settings', { writable: false });

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

        /**
         * 花子の沈黙ユーザー辞書
         */
        this.silenceDictionary = silenceDictionary;
        Object.defineProperty(this, 'silenceDictionary', { writable: false });
    }

    /**
     * 所属DiscordサーバーのID
     */
    get serverId() {
        return this.serverStatus.serverId;
    }

    /**
     * 花子BotのユーザーID
     */
    get userId() {
        return this.serverStatus.userId;
    }

    /**
     * コマンドプリフィクス
     */
    get prefix() {
        return this.serverStatus.prefix;
    }

    /**
     * 花子が持つページ管理可能データの配列
     */
    get pageables() {
        return [this.wordDictionary, this.silenceDictionary];
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

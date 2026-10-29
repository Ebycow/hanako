const errors = require('../core/errors').promises;

/** @typedef {import('discord.js').Client} discord.Client */
/** @typedef {import('discord.js').VoiceState} discord.VoiceState */
/** @typedef {import('discord.js').VoiceChannel} discord.VoiceChannel */
/** @typedef {import('discord.js').GuildMember} discord.GuildMember */

/**
 * VoiceChatActionミドルウェア
 * - 花子が参加していないボイスチャットの情報を無視
 * - 音声状態のアップデート情報をボイスチャット参加・退出アクションに変換
 * - voiceStateUpdateイベントを受け取る
 */
class VoiceChatActionMiddleWare {
    /**
     * @param {discord.Client} client Discord Botのクライアント
     */
    constructor(client) {
        this.client = client;
    }

    /**
     * ミドルウェア変換
     * - イベントがボイスチャットの参加・退出ではないとき errors.abort
     *
     * @param {discord.VoiceState} oldState 旧音声ステータス
     * @param {discord.VoiceState} newState 新音声ステータス
     * @returns {Promise<[discord.VoiceChannel, discord.GuildMember, ('joined'|'left')]>} コントローラに渡す引数
     */
    async transform(oldState, newState) {
        // 花子に起因するイベントは無視
        const member = oldState.member || newState.member;
        if (member.id === this.client.user.id) {
            return errors.abort();
        }

        // 同じチャンネル内の状態変化（ミュートなど）は無視
        if (oldState.channelId === newState.channelId) {
            return errors.abort();
        }

        // ボイスチャット退出イベント（別のVCへの移動を含む）
        if (oldState.channel !== null && this.hasHanako(oldState.channel)) {
            return Promise.resolve([oldState.channel, oldState.member, 'left']);
        }

        // ボイスチャット参加イベント（別のVCからの移動を含む）
        if (newState.channel !== null && this.hasHanako(newState.channel)) {
            return Promise.resolve([newState.channel, newState.member, 'joined']);
        }

        // 花子が参加していないVCのイベントは無視
        return errors.abort();
    }

    /**
     * 花子が参加しているチャンネルか
     *
     * @param {discord.VoiceChannel} channel 音声チャンネル
     * @returns {boolean}
     * @private
     */
    hasHanako(channel) {
        return channel.members.some((m) => m.id === this.client.user.id);
    }
}

module.exports = VoiceChatActionMiddleWare;

const path = require('path');
const logger = require('log4js').getLogger(path.basename(__filename));
const utils = require('../core/utils');
const HanakoLoader = require('../service/hanako_loader');
const AutoLeaveService = require('../service/auto_leave_service');

/** @typedef {import('discord.js').Client} discord.Client */
/** @typedef {import('discord.js').VoiceState} discord.VoiceState */
/** @typedef {import('discord.js').VoiceChannel} discord.VoiceChannel */
/** @typedef {import('discord.js').GuildMember} discord.GuildMember */

/**
 * AutoLeaveコントローラ
 * - 一人残された時のボイスチャット自動退出に対応する
 * - voiceStateUpdateイベントを受け取る
 */
class AutoLeaveCtrl {
    /**
     * @param {discord.Client} client Discord Botのクライアント
     */
    constructor(client) {
        this.client = client;
        this.hanakoLoader = new HanakoLoader();
        this.autoLeaveService = new AutoLeaveService();

        logger.trace('セットアップ完了');
    }

    /**
     * 一人残された時のボイスチャット自動退出を処理
     * - 退出アクションではないとき erros.abort
     *
     * @param {discord.VoiceChannel} channel アクションが発生したチャンネル
     * @param {discord.GuildMember} member アクションを実行したユーザー
     * @param {'joined'|'left'} actionType アクションの種類
     */
    async onAutoLeave(channel, member, actionType) {
        utils.ensure(actionType === 'left');

        // 読み上げ花子モデルを取得
        const hanako = await this.hanakoLoader.load(member.guild.id);

        // 自動退出サービスを実行
        const autoLeaveParam = {
            serverName: member.guild.name,
            voiceChannelName: channel.name,
            voiceChannelMembersId: channel.members.map(m => m.id),
        };
        await this.autoLeaveService.serve(hanako, autoLeaveParam);
    }
}

module.exports = AutoLeaveCtrl;

const path = require('path');
const logger = require('log4js').getLogger(path.basename(__filename));
const HanakoLoader = require('../service/hanako_loader');
const PagerBuilder = require('../service/pager_builder');
const PagerService = require('../service/pager_service');

/** @typedef {import('discord.js').Client} discord.Client */
/** @typedef {import('discord.js').MessageReaction} discord.MessageReaction */
/** @typedef {import('discord.js').User} discord.User */

/**
 * PagerReactionコントローラ
 * - ページングリアクションに対応する
 * - messageReactionAdd, messageReactionRemoveイベントを受け取る
 */
class PagerReactionCtrl {
    /**
     * @param {discord.Client} client Discord Botのクライアント
     */
    constructor(client) {
        this.client = client;
        this.hanakoLoader = new HanakoLoader();
        this.pagerBuilder = new PagerBuilder();
        this.pagerService = new PagerService();

        logger.trace('セットアップ完了');
    }

    /**
     * on('messageReactionAdd')イベント
     */
    async onMessageReactionAdd(...args) {
        return this.onPagerReaction(...args);
    }

    /**
     * on('messageReactionRemove')イベント
     */
    async onMessageReactionRemove(...args) {
        return this.onPagerReaction(...args);
    }

    /**
     *
     * @param {discord.MessageReaction} reaction 付与または削除されたリアクション
     * @param {discord.User} user リアクションを付与または削除したユーザー
     * @param {'forward'|'backward'} direction ページングの方向
     */
    async onPagerReaction(reaction, user, direction) {
        // 読み上げ花子モデルを取得
        const hanako = await this.hanakoLoader.load(reaction.message.guild.id);

        // メッセージ内容からPagerを生成
        const pager = await this.pagerBuilder.build(hanako, reaction.message.content);

        // Pagerサービスを実行して次のテキストを取得
        const nextContent = await this.pagerService.serve(pager, direction);

        // 次のテキストを表示して終了
        await reaction.message.edit(nextContent);
    }
}

module.exports = PagerReactionCtrl;

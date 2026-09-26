const path = require('path');
const logger = require('log4js').getLogger(path.basename(__filename));
const HanakoLoader = require('../service/hanako_loader');
const PagerBuilder = require('../service/pager_builder');
const PagerService = require('../service/pager_service');
const { pagerDirectionOf } = require('../service/pager_buttons');
const errors = require('../core/errors').promises;

/** @typedef {import('discord.js').Client} discord.Client */
/** @typedef {import('discord.js').Interaction} discord.Interaction */

/**
 * PagerButtonコントローラ
 * - スラッシュコマンドの一覧表示に付けたページ送りボタンを処理する
 * - interactionCreateイベントを受け取る
 */
class PagerButtonCtrl {
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
     * ページ送りボタンの押下を処理
     * - ページ送りボタン以外のインタラクションのとき errors.abort
     *
     * @param {discord.Interaction} interaction 受信したインタラクション
     */
    async onPagerButton(interaction) {
        const direction = interaction.isButton() ? pagerDirectionOf(interaction.customId) : null;
        if (!direction || !interaction.inCachedGuild()) {
            return errors.abort();
        }

        // 読み上げ花子モデルを取得
        const hanako = await this.hanakoLoader.load(interaction.guild.id);

        // メッセージ内容からPagerを生成
        const pager = await this.pagerBuilder.build(hanako, interaction.message.content);

        // Pagerサービスを実行して次のテキストを取得
        const nextContent = await this.pagerService.serve(pager, direction);

        // ボタンを押したメッセージを次のページに書き換えて終了
        await interaction.update({ content: nextContent });
    }
}

module.exports = PagerButtonCtrl;

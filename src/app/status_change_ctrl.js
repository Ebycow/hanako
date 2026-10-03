const path = require('path');
const logger = require('log4js').getLogger(path.basename(__filename));
const StatusService = require('../service/status_service');
const { ActivityType } = require('discord.js');

/** @typedef {import('discord.js').Client} discord.Client */

/**
 * ボットステータスの更新間隔（ミリ秒）
 * プレゼンス更新にはGatewayのレート制限があるため、読み上げのたびには更新しない
 */
const STATUS_UPDATE_INTERVAL_MS = 60000;

/**
 * Statusコントローラ
 * - ボットステータスの変更を処理する
 * - clientReadyイベントを受け取り、以降は定期的にステータスを更新する
 */
class StatusChangeCtrl {
    /**
     * @param {discord.Client} client Discord Botのクライアント
     */
    constructor(client) {
        this.client = client;
        this.service = new StatusService();
        this.timer = null;
        this.lastStatus = null;

        logger.trace('セットアップ完了');
    }

    /**
     * ボットステータスの定期更新を開始
     */
    async onStatusChange() {
        if (this.timer !== null) {
            return;
        }

        this.timer = setInterval(() => {
            this.update().catch((e) => logger.warn('ボットステータスの更新に失敗', e));
        }, STATUS_UPDATE_INTERVAL_MS);
        this.timer.unref();

        await this.update();
    }

    /**
     * ボットステータスが変わっていれば更新する
     *
     * @returns {Promise<void>}
     */
    async update() {
        const status = await this.service.serve();
        if (status === this.lastStatus) {
            return;
        }

        this.client.user.setActivity(status, { type: ActivityType.Streaming });
        this.lastStatus = status;
    }
}

module.exports = StatusChangeCtrl;

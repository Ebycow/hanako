const path = require('path');
const logger = require('log4js').getLogger(path.basename(__filename));
const RecoveryService = require('../service/recovery_service');
const RecoverySupervisor = require('../service/recovery_supervisor');

/** @typedef {import('discord.js').Client} discord.Client */

/**
 * Readyコントローラ
 * - 読み上げ花子のスタートアップ処理を行う
 * - readyイベントを受け取る
 */
class ReadyCtrl {
    /**
     * @param {discord.Client} client Discord Botのクライアント
     */
    constructor(client) {
        this.client = client;
        this.recoveryService = new RecoveryService();
        this.recoverySupervisor = new RecoverySupervisor();

        logger.trace('セットアップ完了');
    }

    /**
     * 読み上げ花子のスタートアップ処理
     */
    async onReady() {
        logger.info(`Logged in as ${this.client.user.tag}!`);

        // ボイスチャット復帰サービスを実行
        await this.recoveryService.serve();

        // ボイスチャット復帰の監督を開始
        await this.recoverySupervisor.supervise();
    }
}

module.exports = ReadyCtrl;

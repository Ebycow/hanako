const path = require('path');
const fs = require('fs');
const logger = require('log4js').getLogger(path.basename(__filename));
const { Status } = require('discord.js');

/** @typedef {import('discord.js').Client} discord.Client */

/**
 * ハートビートファイルの更新間隔（ミリ秒）
 * Dockerのhealthcheckはこのファイルの更新時刻が古くなったら異常とみなす
 */
const HEARTBEAT_INTERVAL_MS = 30000;

/**
 * ハートビートファイルのパス
 */
const HEARTBEAT_FILE = process.env.HEARTBEAT_FILE || '/tmp/hanako-heartbeat';

/**
 * Heartbeatコントローラ
 * - 死活監視用のハートビートファイルを更新する
 * - clientReadyイベントを受け取り、以降はDiscordに接続できている間だけ定期的に更新する
 */
class HeartbeatCtrl {
    /**
     * @param {discord.Client} client Discord Botのクライアント
     */
    constructor(client) {
        this.client = client;
        this.timer = null;

        logger.trace('セットアップ完了');
    }

    /**
     * ハートビートの定期更新を開始
     */
    async onHeartbeat() {
        if (this.timer !== null) {
            return;
        }

        this.timer = setInterval(() => this.beat(), HEARTBEAT_INTERVAL_MS);
        this.timer.unref();

        this.beat();
    }

    /**
     * Discordに接続できていればハートビートファイルを更新する
     * （全体のステータスは一度Readyになると戻らないため、各シャードの状態を見る）
     */
    beat() {
        const connected =
            this.client.isReady() && this.client.ws.shards.every((shard) => shard.status === Status.Ready);
        if (!connected) {
            logger.debug('Discordに接続できていないため、ハートビートを更新しない');
            return;
        }

        try {
            fs.writeFileSync(HEARTBEAT_FILE, String(Date.now()));
        } catch (e) {
            logger.warn('ハートビートファイルの更新に失敗', e);
        }
    }
}

module.exports = HeartbeatCtrl;

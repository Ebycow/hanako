const path = require('path');
const logger = require('log4js').getLogger(path.basename(__filename));
const MessageCtrl = require('./app/message_ctrl');

/** @typedef {import('discord.js').Client} discord.Client */

/**
 * 最上位までハンドルされなかった例外をエラーログとして出力
 * @param {any} err
 */
function handleUncaughtError(err) {
    if (err === 0) {
        // TODO FIX 中断エラー共通化
        return Promise.resolve();
    }

    logger.error('予期しないエラーが発生。', err);
    return Promise.resolve();
}

/**
 * 読み上げ花子
 */
class Hanako {
    /**
     * @param {string} token Discord Botのトークン
     * @param {discord.Client} client Discord Botのクライアント
     */
    constructor(token, client) {
        this.token = token;
        this.client = client;
    }

    /**
     * アプリケーションのエントリポイント
     */
    start() {
        this.bind('message', new MessageCtrl());

        // TODO FIX
        this.client.on('ready', () => logger.info('ready'));

        this.client.login(this.token);
    }

    /**
     * コントローラをバインド
     * @param {string} event Discordイベント名
     * @param {{[key: string]: function(...):Promise<void>}} ctrl コントローラのインスタンス
     * @private
     */
    bind(event, ctrl) {
        const method = 'on' + event.slice(0, 1).toUpperCase() + event.slice(1);
        this.client.on(event, (...args) => ctrl[method](...args).catch(handleUncaughtError));
    }
}

module.exports = Hanako;

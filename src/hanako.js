const path = require('path');
const logger = require('log4js').getLogger(path.basename(__filename));
const MessageCtrl = require('./app/message_ctrl');
const MessageSanitizeMiddleWare = require('./app/message_sanitize_middle_ware');

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
        this.bind('message', MessageCtrl, [MessageSanitizeMiddleWare]);

        // TODO FIX
        this.client.on('ready', () => logger.info('ready'));

        this.client.login(this.token);
    }

    /**
     * コントローラをバインド
     *
     * @param {string} event Discordイベント名
     * @param {Function} C コントローラのクラス
     * @param {Function[]} [middlewares=[]] ミドルウェアのクラス
     * @private
     */
    bind(event, C, middlewares = []) {
        const chain = middlewares.map(M => new M(this.client)).map(o => o.transform.bind(o));
        const method = 'on' + event.slice(0, 1).toUpperCase() + event.slice(1);
        const ctrl = new C(this.client);
        chain.push(ctrl[method].bind(ctrl));
        const callp = zP => chain.reduce((p, f) => p.then(r => (Array.isArray(r) ? f(...r) : f(r))), zP);
        this.client.on(event, (...args) => callp(Promise.resolve(args)).catch(handleUncaughtError));
    }
}

module.exports = Hanako;

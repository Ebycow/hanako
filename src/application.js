const path = require('path');
const logger = require('log4js').getLogger(path.basename(__filename));
const discord = require('discord.js');
const Injector = require('./core/injector');
const MessageCtrl = require('./app/message_ctrl');
const MessageSanitizeMiddleWare = require('./app/message_sanitize_middle_ware');

/**
 * 最上位までハンドルされなかった例外をエラーログとして出力
 *
 * @param {any} err エラーオブジェクト
 */
function handleUncaughtError(err) {
    if (err.eby && err.type === 'abort') {
        // === EbyAbortError
        return Promise.resolve();
    }

    logger.error('予期しないエラーが発生。', err);
    return Promise.resolve();
}

/**
 * 読み上げ花子アプリケーション
 */
class Application {
    /**
     * @param {string} token Discord Botのトークン
     * @param {null} client DI
     */
    constructor(token, client = null) {
        this.token = token;
        this.client = client || Injector.resolveSingleton(discord.Client);
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
     * @param {Function[]} [middlewares=[]] ミドルウェアのクラス配列（実行順）
     * @private
     */
    bind(event, C, middlewares = []) {
        const chain = middlewares.map(M => M.prototype.transform.bind(new M(this.client)));
        const method = 'on' + event.slice(0, 1).toUpperCase() + event.slice(1);
        chain.push(C.prototype[method].bind(new C(this.client)));
        const callp = zP => chain.reduce((p, f) => p.then(r => (Array.isArray(r) ? f(...r) : f(r))), zP);
        this.client.on(event, (...args) => callp(Promise.resolve(args)).catch(handleUncaughtError));
    }
}

module.exports = Application;
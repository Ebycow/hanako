const path = require('path');
const logger = require('log4js').getLogger(path.basename(__filename));
const discord = require('discord.js');
const { GatewayIntentBits } = require('discord.js');
const Injector = require('./core/injector');
const AppConfig = require('./core/app_config');
const AppSettings = require('./core/app_settings');
const MessageCtrl = require('./app/message_ctrl');
const ReadyCtrl = require('./app/ready_ctrl');
const PagerReactionCtrl = require('./app/pager_reaction_ctrl');
const AutoLeaveCtrl = require('./app/auto_leave_ctrl');
const StatusChangeCtrl = require('./app/status_change_ctrl');
const MessageSanitizeMiddleWare = require('./app/message_sanitize_middle_ware');
const PagerReactionFilterMiddleWare = require('./app/pager_reaction_filter_middle_ware');
const VoiceChatActionMiddleWare = require('./app/voice_chat_action_middle_ware');
const http = require('http');

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
     * 読み上げ花子アプリケーションを構築
     *
     * @param {AppConfig} appConfig アプリケーションのDIコンフィグ
     * @param {AppSettings} appSettings アプリケーションの設定
     */
    constructor(appConfig, appSettings) {
        this.appConfig = appConfig;
        this.appSettings = appSettings;
        this.client = new discord.Client({
            intents: [
                GatewayIntentBits.Guilds,
                GatewayIntentBits.GuildMessages,
                GatewayIntentBits.MessageContent,
                GatewayIntentBits.GuildMessageReactions,
                GatewayIntentBits.DirectMessageReactions,
                GatewayIntentBits.GuildVoiceStates,
            ],
        });

        this.httpServer = http.createServer((request, response) => {
            response.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
            response.end('OK');
        });
    }

    /**
     * アプリケーションのエントリポイント
     */
    start() {
        // DIコンフィグを適用
        this.appConfig.configure();

        // シングルトンDIを設定
        Injector.registerSingleton(AppConfig, this.appConfig);
        Injector.registerSingleton(AppSettings, this.appSettings);
        Injector.registerSingleton(discord.Client, this.client);

        // コントローラの登録
        this.bind('ready', ReadyCtrl);
        this.bind('messageCreate', MessageCtrl, [MessageSanitizeMiddleWare]);
        this.bind('messageCreate', StatusChangeCtrl, [MessageSanitizeMiddleWare]);
        this.bind('messageReactionAdd', PagerReactionCtrl, [PagerReactionFilterMiddleWare]);
        this.bind('messageReactionRemove', PagerReactionCtrl, [PagerReactionFilterMiddleWare]);
        this.bind('voiceStateUpdate', AutoLeaveCtrl, [VoiceChatActionMiddleWare]);

        // 待受開始
        this.client.login(this.appSettings.discordBotToken);
        this.httpServer.listen(8753, '0.0.0.0', () => {
            logger.trace(
                `Webサーバを http://${this.httpServer.address().address}:${this.httpServer.address().port} でリッスン`
            );
        });
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
        const method = 'on' + C.name.slice(0, -4);
        chain.push(C.prototype[method].bind(new C(this.client)));
        const callp = zP => chain.reduce((p, f) => p.then(r => (Array.isArray(r) ? f(...r) : f(r))), zP);
        this.client.on(event, (...args) => callp(Promise.resolve(args)).catch(handleUncaughtError));
    }
}

module.exports = Application;

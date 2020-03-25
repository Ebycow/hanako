// TODO FIX ファイル名・クラス名等ちゃんとする

const path = require('path');
const logger = require('log4js').getLogger(path.basename(__filename));
const exitHook = require('async-exit-hook');

let firstCall = true;

function init() {
    logger.info('Graceful Shutdownを設定しています。');
    exitHook.uncaughtExceptionHandler(err => {
        logger.fatal('キャッチされなかった例外が発生。', err);
    });
}

function suppress(e) {
    logger.warn('Graceful Shutdown中にエラー。握りつぶした。', e);
    return Promise.resolve();
}

/**
 * Graceful Shutdownをするためのユーティリティクラス
 */
class GracefulShutdown {
    /**
     * 終了前処理のハンドラを追加
     *
     * @param {function(void):(void|Promise<void>)} handler
     */
    static onExit(handler) {
        if (firstCall) {
            firstCall = false;
            init();
        }
        const ensured = async () => handler();
        const start = () => ensured().catch(suppress);
        exitHook(done => start().finally(() => done()));
    }
}

module.exports = GracefulShutdown;

const path = require('path');
const logger = require('log4js').getLogger(path.basename(__filename));
const assert = require('assert').strict;
const exitHook = require('async-exit-hook');
const IShutdownDelegator = require('../../domain/service/i_shutdown_delegator');

/**
 * モジュールの初回呼び出しフラグ
 *
 * @type {boolean}
 */
let firstCall = true;

/**
 * 一時的なネットワークエラーかどうかを判定
 *
 * @param {Error} err
 * @returns {boolean}
 */
function isTransientNetworkError(err) {
    const transientCodes = ['ENOTFOUND', 'ECONNRESET', 'ECONNREFUSED', 'ETIMEDOUT', 'EAI_AGAIN'];
    if (err.code && transientCodes.includes(err.code)) {
        return true;
    }
    const transientStatuses = ['502', '503', '504', '522', '524'];
    if (err.message && transientStatuses.some(s => err.message.includes(s))) {
        return true;
    }
    return false;
}

/**
 * モジュールの初期化（実際にこの実装がDIされるまで初期化処理を遅延させる）
 */
function init() {
    // 非キャッチ例外のハンドラ（一時的なネットワークエラーはプロセスを維持する）
    process.on('uncaughtException', err => {
        if (isTransientNetworkError(err)) {
            logger.warn('一時的なネットワークエラーが発生。プロセスを維持する。', err);
            return;
        }
        logger.fatal('キャッチされなかった例外が発生。', err);
        // SIGTERMでexitHookの非同期グレースフルシャットダウンをトリガー
        process.kill(process.pid, 'SIGTERM');
    });

    // 未処理のPromiseリジェクションのハンドラ
    process.on('unhandledRejection', err => {
        if (isTransientNetworkError(err)) {
            logger.warn('一時的なネットワークエラー(Promise)が発生。プロセスを維持する。', err);
            return;
        }
        logger.fatal('未処理のPromiseリジェクションが発生。', err);
        process.kill(process.pid, 'SIGTERM');
    });

    logger.trace('モジュールが初期化された');
}

/**
 * ログを出力してエラーを握りつぶす
 *
 * @param {any} e
 */
async function suppress(e) {
    logger.warn('Graceful Shutdown 処理中にエラー。握りつぶした。', e);
    return Promise.resolve();
}

/**
 * NodeJSプロセスのGracefulShutdownマネージャー
 *
 * @implements {IShutdownDelegator}
 */
class ProcessGracefulShutdownManager {
    /**
     * DIコンテナ用コンストラクタ
     * 初回呼び出し時にはモジュール初期化を行う
     */
    constructor() {
        if (firstCall) {
            firstCall = false;
            init();
        }
    }

    /**
     * (impl) IShutdownDelegator
     *
     * @param {function(void):Promise<void>} func
     * @returns {Promise<void>}
     */
    async delegate(func) {
        assert(typeof func === 'function');

        const ensured = async () => func();
        const start = () => ensured().catch(suppress);
        exitHook(done => start().finally(() => done()));
    }
}

// IShutdownDelegatorの実装として登録
IShutdownDelegator.comprise(ProcessGracefulShutdownManager);

module.exports = ProcessGracefulShutdownManager;

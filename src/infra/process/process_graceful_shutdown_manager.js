const path = require('path');
const logger = require('log4js').getLogger(path.basename(__filename));
const assert = require('assert').strict;
const IShutdownDelegator = require('../../domain/service/i_shutdown_delegator');

/**
 * モジュールの初回呼び出しフラグ
 *
 * @type {boolean}
 */
let firstCall = true;

/**
 * 終了前処理の完了を待つ上限時間（ミリ秒）
 *
 * @type {number}
 */
const SHUTDOWN_TIMEOUT_MS = 10000;

/**
 * 終了前処理を始めるシグナルと、そのときの終了コード（128 + シグナル番号）
 * Windows でコンソールを閉じたとき（deploy.ps1 の taskkill）は SIGHUP、Ctrl+Break は SIGBREAK になる
 *
 * @type {Array<[string, number]>}
 */
const SHUTDOWN_SIGNALS = [
    ['SIGHUP', 128 + 1],
    ['SIGINT', 128 + 2],
    ['SIGTERM', 128 + 15],
    ['SIGBREAK', 128 + 21],
];

/**
 * 委譲された終了前処理
 *
 * @type {Array<function(void):Promise<void>>}
 */
const hooks = [];

/**
 * 終了前処理を始めたかどうか（シグナルが重ねて届いても1回だけ実行する）
 *
 * @type {boolean}
 */
let shuttingDown = false;

/**
 * 終了前処理をすべて並行して実行し、終わったらプロセスを終了する
 * 上限時間を過ぎても終わらなければ、待たずに終了する
 *
 * @param {number} code 終了コード
 * @param {string} reason 終了する理由（ログ用）
 */
function shutdown(code, reason) {
    if (shuttingDown) {
        return;
    }
    shuttingDown = true;
    logger.info(`${reason}のため終了する。終了前処理を${hooks.length}件実行する。`);

    const timer = setTimeout(() => {
        logger.warn(`終了前処理が${SHUTDOWN_TIMEOUT_MS}ms以内に終わらなかったため、待たずに終了する。`);
        // Discordとの接続などがイベントループに残っているため、明示的に終了させる
        // eslint-disable-next-line n/no-process-exit
        process.exit(code);
    }, SHUTDOWN_TIMEOUT_MS);

    Promise.allSettled(hooks.map((hook) => hook())).then(() => {
        clearTimeout(timer);
        // eslint-disable-next-line n/no-process-exit
        process.exit(code);
    });
}

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
    if (err.message && transientStatuses.some((s) => err.message.includes(s))) {
        return true;
    }
    return false;
}

/**
 * モジュールの初期化（実際にこの実装がDIされるまで初期化処理を遅延させる）
 */
function init() {
    // 終了シグナルとイベントループが空になったときに、終了前処理を実行してから終了する
    for (const [signal, code] of SHUTDOWN_SIGNALS) {
        process.on(signal, () => shutdown(code, signal));
    }
    process.on('beforeExit', () => shutdown(0, 'beforeExit'));

    // 非キャッチ例外のハンドラ（一時的なネットワークエラーはプロセスを維持する）
    process.on('uncaughtException', (err) => {
        if (isTransientNetworkError(err)) {
            logger.warn('一時的なネットワークエラーが発生。プロセスを維持する。', err);
            return;
        }
        logger.fatal('キャッチされなかった例外が発生。', err);
        // 終了前処理を実行してから異常終了する
        // （自分に SIGTERM を送る方法は、Windows では即座に強制終了になり終了前処理が動かない）
        shutdown(1, 'キャッチされなかった例外');
    });

    // 未処理のPromiseリジェクションのハンドラ
    process.on('unhandledRejection', (err) => {
        if (isTransientNetworkError(err)) {
            logger.warn('一時的なネットワークエラー(Promise)が発生。プロセスを維持する。', err);
            return;
        }
        logger.fatal('未処理のPromiseリジェクションが発生。', err);
        shutdown(1, '未処理のPromiseリジェクション');
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
        hooks.push(() => ensured().catch(suppress));
    }
}

// IShutdownDelegatorの実装として登録
IShutdownDelegator.comprise(ProcessGracefulShutdownManager);

module.exports = ProcessGracefulShutdownManager;

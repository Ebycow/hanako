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
 * モジュールの初期化（実際にこの実装がDIされるまで初期化処理を遅延させる）
 */
function init() {
    // 非キャッチ例外で死ぬ時のフック
    exitHook.uncaughtExceptionHandler(err => {
        logger.fatal('キャッチされなかった例外が発生。', err);
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

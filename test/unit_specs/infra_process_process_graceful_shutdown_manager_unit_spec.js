require('chai').should();
const sinon = require('sinon');
const proxyquire = require('proxyquire').noCallThru().noPreserveCache();

/************************************************************************
 * ProcessGracefulShutdownManagerクラス単体スペック
 *
 * メソッド：#delegate
 * 期待動作：終了シグナル・致命的なエラーを受けたら、委譲された終了前処理を実行してから終了する
 * 備考：プロセスのイベント登録と process.exit はスタブに差し替える
 ***********************************************************************/

describe('ProcessGracefulShutdownManager', () => {
    /** @type {Map<string, Function>} */
    let handlers;
    let exit;
    let clock;
    let ProcessGracefulShutdownManager;

    /** 終了前処理の Promise が片付くまで待つ */
    const settle = () => new Promise((resolve) => setImmediate(resolve));

    /** モジュールを読み直し、プロセスのイベント登録を横取りしてマネージャーを作る */
    function createManager() {
        ProcessGracefulShutdownManager = proxyquire('../../src/infra/process/process_graceful_shutdown_manager', {
            '../../domain/service/i_shutdown_delegator': { comprise: () => {} },
        });
        const on = sinon.stub(process, 'on').callsFake((event, handler) => {
            handlers.set(event, handler);
            return process;
        });
        try {
            return new ProcessGracefulShutdownManager();
        } finally {
            on.restore();
        }
    }

    beforeEach(() => {
        handlers = new Map();
        exit = sinon.stub(process, 'exit');
    });

    afterEach(() => {
        exit.restore();
        if (clock) {
            clock.restore();
            clock = null;
        }
    });

    specify('終了シグナルとイベントループが空になったときのハンドラを登録する', () => {
        createManager();
        ['SIGHUP', 'SIGINT', 'SIGTERM', 'SIGBREAK', 'beforeExit'].forEach(
            (event) => handlers.has(event).should.be.true
        );
    });

    specify('SIGTERM で終了前処理をすべて実行してから 143 で終了する', async () => {
        const manager = createManager();
        const first = sinon.stub().resolves();
        const second = sinon.stub().resolves();
        await manager.delegate(first);
        await manager.delegate(second);

        handlers.get('SIGTERM')();
        await settle();

        first.calledOnce.should.be.true;
        second.calledOnce.should.be.true;
        exit.calledOnceWith(143).should.be.true;
    });

    specify('シグナルが重ねて届いても終了前処理は1回だけ実行する', async () => {
        const manager = createManager();
        const hook = sinon.stub().resolves();
        await manager.delegate(hook);

        handlers.get('SIGINT')();
        handlers.get('SIGTERM')();
        await settle();

        hook.calledOnce.should.be.true;
        exit.calledOnceWith(130).should.be.true;
    });

    specify('終了前処理が失敗しても終了する', async () => {
        const manager = createManager();
        await manager.delegate(sinon.stub().rejects(new Error('boom')));

        handlers.get('SIGHUP')();
        await settle();

        exit.calledOnceWith(129).should.be.true;
    });

    specify('終了前処理が上限時間内に終わらなければ待たずに終了する', async () => {
        clock = sinon.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
        const manager = createManager();
        await manager.delegate(() => new Promise(() => {}));

        handlers.get('SIGTERM')();
        await settle();
        exit.called.should.be.false;

        clock.tick(10000);
        exit.calledOnceWith(143).should.be.true;
    });

    specify('キャッチされなかった例外では終了前処理を実行してから 1 で終了する', async () => {
        const manager = createManager();
        const hook = sinon.stub().resolves();
        await manager.delegate(hook);

        handlers.get('uncaughtException')(new Error('fatal'));
        await settle();

        hook.calledOnce.should.be.true;
        exit.calledOnceWith(1).should.be.true;
    });

    specify('未処理のPromiseリジェクションでは終了前処理を実行してから 1 で終了する', async () => {
        const manager = createManager();
        const hook = sinon.stub().resolves();
        await manager.delegate(hook);

        handlers.get('unhandledRejection')(new Error('fatal'));
        await settle();

        hook.calledOnce.should.be.true;
        exit.calledOnceWith(1).should.be.true;
    });

    specify('一時的なネットワークエラーでは終了しない', async () => {
        const manager = createManager();
        const hook = sinon.stub().resolves();
        await manager.delegate(hook);

        handlers.get('uncaughtException')(Object.assign(new Error('reset'), { code: 'ECONNRESET' }));
        await settle();

        hook.called.should.be.false;
        exit.called.should.be.false;
    });
});

require('chai').should();
const fs = require('fs');
const os = require('os');
const path = require('path');
const sinon = require('sinon');
const proxyquire = require('proxyquire').noCallThru();

/************************************************************************
 * HeartbeatCtrlクラス単体スペック
 *
 * メソッド：#onHeartbeat, #beat
 * 期待動作：Discordに接続できている間だけハートビートファイルを更新する
 * 備考：なし
 ***********************************************************************/

describe('HeartbeatCtrl', () => {
    const Status = { Ready: 0, Resuming: 8 };
    let dir;
    let file;
    let clock;
    let HeartbeatCtrl;

    function clientOf({ ready = true, shards = [Status.Ready] } = {}) {
        return {
            isReady: () => ready,
            ws: { shards: shards.map((status) => ({ status })) },
        };
    }

    beforeEach(() => {
        dir = fs.mkdtempSync(path.join(os.tmpdir(), 'hanako-heartbeat-'));
        file = path.join(dir, 'heartbeat');
        process.env.HEARTBEAT_FILE = file;
        HeartbeatCtrl = proxyquire('../../src/app/heartbeat_ctrl', {
            'discord.js': { Status },
        });
    });

    afterEach(() => {
        if (clock) {
            clock.restore();
            clock = null;
        }
        delete process.env.HEARTBEAT_FILE;
        fs.rmSync(dir, { recursive: true, force: true });
    });

    it('接続中ならすぐにハートビートファイルを書く', async () => {
        await new HeartbeatCtrl(clientOf()).onHeartbeat();

        fs.existsSync(file).should.be.true;
    });

    it('クライアントがReadyでなければ書かない', () => {
        new HeartbeatCtrl(clientOf({ ready: false })).beat();

        fs.existsSync(file).should.be.false;
    });

    it('Readyでないシャードがあれば書かない', () => {
        new HeartbeatCtrl(clientOf({ shards: [Status.Ready, Status.Resuming] })).beat();

        fs.existsSync(file).should.be.false;
    });

    it('定期的に更新し、二重には開始しない', async () => {
        clock = sinon.useFakeTimers({ now: 1000, toFake: ['setInterval', 'Date'] });
        const ctrl = new HeartbeatCtrl(clientOf());
        const beat = sinon.spy(ctrl, 'beat');

        await ctrl.onHeartbeat();
        await ctrl.onHeartbeat();
        beat.callCount.should.equal(1);

        clock.tick(30000);
        beat.callCount.should.equal(2);
        fs.readFileSync(file, 'utf8').should.equal('31000');
    });
});

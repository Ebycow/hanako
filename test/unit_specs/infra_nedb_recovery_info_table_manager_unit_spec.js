require('chai').should();
const { loadWithInMemoryNedb } = require('../helpers/in_memory_nedb');
const RecoveryInfo = require('../../src/domain/entity/recovery_info');

/************************************************************************
 * NedbRecoveryInfoTableManager コントラクトテスト
 ***********************************************************************/

describe('NedbRecoveryInfoTableManager', () => {
    let Manager;
    let instances;

    const info = (serverId, voiceChannelId, readingChannelsId) =>
        new RecoveryInfo({ id: 'x', serverId, voiceChannelId, readingChannelsId });

    beforeEach(() => {
        ({ Manager, instances } = loadWithInMemoryNedb('../../src/infra/nedb/nedb_recovery_info_table_manager', {
            '../../domain/repo/i_recovery_info_repo': { comprise() {} },
        }));
    });

    specify('何も保存していなければ空の配列を返す', async () => {
        (await new Manager().loadAllRecoveryInfo()).should.deep.equal([]);
    });

    specify('保存したリカバリ情報をすべて読み戻せる', async () => {
        const mgr = new Manager();
        await mgr.saveRecoveryInfo(info('s1', 'v1', ['t1']));
        await mgr.saveRecoveryInfo(info('s2', 'v2', ['t2']));

        const loaded = await mgr.loadAllRecoveryInfo();
        loaded.should.have.lengthOf(2);
        loaded.forEach((x) => x.should.be.an.instanceOf(RecoveryInfo));
        const byServer = Object.fromEntries(loaded.map((x) => [x.serverId, x]));
        byServer.s1.voiceChannelId.should.equal('v1');
        byServer.s1.readingChannelsId.should.deep.equal(['t1']);
        byServer.s2.voiceChannelId.should.equal('v2');
        byServer.s2.readingChannelsId.should.deep.equal(['t2']);
    });

    specify('読み上げチャンネルは先頭の一つだけを保存する', async () => {
        const mgr = new Manager();
        await mgr.saveRecoveryInfo(info('s1', 'v1', ['t1', 't2']));
        const [loaded] = await mgr.loadAllRecoveryInfo();
        loaded.readingChannelsId.should.deep.equal(['t1']);
    });

    specify('レコードはサーバー・通話・読み上げチャンネルの短い名前で保存する', async () => {
        const mgr = new Manager();
        await mgr.saveRecoveryInfo(info('s1', 'v1', ['t1']));
        const [doc] = await instances[0].findAsync({});
        doc.should.include({ segment: 's1', voice: 'v1', text: 't1' });
    });

    specify('#deleteAllRecoveryInfo ですべて消える', async () => {
        const mgr = new Manager();
        await mgr.saveRecoveryInfo(info('s1', 'v1', ['t1']));
        await mgr.saveRecoveryInfo(info('s2', 'v2', ['t2']));
        await mgr.deleteAllRecoveryInfo();
        (await mgr.loadAllRecoveryInfo()).should.deep.equal([]);
    });

    specify('空のときに #deleteAllRecoveryInfo しても失敗しない', async () => {
        await new Manager().deleteAllRecoveryInfo();
    });
});

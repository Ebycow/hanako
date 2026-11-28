const should = require('chai').should();
const { loadWithInMemoryNedb } = require('../helpers/in_memory_nedb');
const SilenceDictionary = require('../../src/domain/entity/silence_dictionary');
const SilenceCreateAction = require('../../src/domain/entity/actions/silence_create_action');
const SilenceDeleteAction = require('../../src/domain/entity/actions/silence_delete_action');
const SilenceClearAction = require('../../src/domain/entity/actions/silence_clear_action');

/************************************************************************
 * NedbSilenceDictionaryTableManager コントラクトテスト
 *
 * 方針：NeDB を in-memory で動かし、沈黙ユーザーの CRUD とキャッシュの整合性を実物で保証する。
 ***********************************************************************/

describe('NedbSilenceDictionaryTableManager', () => {
    let Manager;
    let instances;

    function findDocs(query) {
        return instances[0].findAsync(query);
    }

    const create = (serverId, userId) => new SilenceCreateAction({ id: 'a', serverId, userId });
    const del = (serverId, silenceId) => new SilenceDeleteAction({ id: 'a', serverId, silenceId });
    const clear = (serverId) => new SilenceClearAction({ id: 'a', serverId });

    beforeEach(() => {
        ({ Manager, instances } = loadWithInMemoryNedb('../../src/infra/nedb/nedb_silence_dictionary_table_manager', {
            '../../domain/repo/i_silence_action_repo': { comprise() {} },
            '../../domain/repo/i_silence_dictionary_repo': { comprise() {} },
        }));
    });

    describe('#loadSilenceDictionary', () => {
        specify('未登録のサーバーは空の辞書を返し、空のドキュメントを作る', async () => {
            const dict = await new Manager().loadSilenceDictionary('s1');
            dict.should.be.an.instanceOf(SilenceDictionary);
            dict.serverId.should.equal('s1');
            dict.lines.should.have.lengthOf(0);

            const docs = await findDocs({ id: 's1' });
            docs.should.have.lengthOf(1);
            docs[0].users.should.deep.equal([]);
        });

        specify('既存のドキュメントから行を復元する', async () => {
            const mgr = new Manager();
            const at = new Date('2024-01-02T03:04:05Z');
            await instances[0].insertAsync({ id: 's1', users: [['u1', at, 'x1']] });

            const dict = await mgr.loadSilenceDictionary('s1');
            dict.lines.should.have.lengthOf(1);
            const line = dict.lines[0];
            line.id.should.equal('x1');
            line.dictId.should.equal('s1');
            line.userId.should.equal('u1');
            line.createdAt.getTime().should.equal(at.getTime());
        });

        specify('ユーザーIDだけの古いレコードは、作成日時と ID を補って読み込む', async () => {
            const mgr = new Manager();
            await instances[0].insertAsync({ id: 's1', users: ['old-user', ['u2', new Date(), 'x2']] });

            // Note: 行は作成日時の新しい順に並ぶので、位置ではなくユーザーで探す
            const dict = await mgr.loadSilenceDictionary('s1');
            dict.lines.map((l) => l.userId).should.have.members(['old-user', 'u2']);
            const migrated = dict.lines.find((l) => l.userId === 'old-user');
            migrated.id.should.be.a('string').and.not.be.empty;
            migrated.createdAt.should.be.an.instanceOf(Date);
            dict.lines.find((l) => l.userId === 'u2').id.should.equal('x2');

            // 補った ID はキャッシュにより安定している
            const reloaded = await mgr.loadSilenceDictionary('s1');
            reloaded.lines.find((l) => l.userId === 'old-user').id.should.equal(migrated.id);
        });

        specify('未登録のサーバーを同時に読み込んでも、ドキュメントは 1 件しか作らない', async () => {
            const mgr = new Manager();
            await Promise.all([mgr.loadSilenceDictionary('s1'), mgr.loadSilenceDictionary('s1')]);

            const docs = await findDocs({ id: 's1' });
            docs.should.have.lengthOf(1);
        });

        specify('返した辞書は、その後の追加の影響を受けない', async () => {
            const mgr = new Manager();
            const before = await mgr.loadSilenceDictionary('s1');
            await mgr.postSilenceCreate(create('s1', 'u1'));
            before.lines.should.have.lengthOf(0);
        });
    });

    describe('#postSilenceCreate', () => {
        specify('ユーザーを追加して永続化する', async () => {
            const mgr = new Manager();
            const t0 = Date.now();
            await mgr.postSilenceCreate(create('s1', 'u1'));

            const dict = await mgr.loadSilenceDictionary('s1');
            dict.lines.should.have.lengthOf(1);
            dict.lines[0].userId.should.equal('u1');
            dict.lines[0].createdAt.getTime().should.be.at.least(t0);

            const [doc] = await findDocs({ id: 's1' });
            doc.users.map((r) => r[0]).should.deep.equal(['u1']);
        });

        specify('すでに登録済みのユーザーは disappointed で拒否する', async () => {
            const mgr = new Manager();
            await mgr.postSilenceCreate(create('s1', 'u1'));
            const err = await mgr.postSilenceCreate(create('s1', 'u1')).catch((e) => e);
            err.should.have.property('type', 'disappointed');
            (await mgr.loadSilenceDictionary('s1')).lines.should.have.lengthOf(1);
        });

        specify('サーバーが違えば同じユーザーを登録できる', async () => {
            const mgr = new Manager();
            await mgr.postSilenceCreate(create('s1', 'u1'));
            await mgr.postSilenceCreate(create('s2', 'u1'));
            (await mgr.loadSilenceDictionary('s2')).lines.should.have.lengthOf(1);
        });
    });

    describe('#postSilenceDelete', () => {
        specify('ID で指定した行だけを消して永続化する', async () => {
            const mgr = new Manager();
            await mgr.postSilenceCreate(create('s1', 'u1'));
            await mgr.postSilenceCreate(create('s1', 'u2'));
            // Note: 行は作成日時の新しい順に並び、同じミリ秒に作ると順序が決まらないので、位置ではなくユーザーで探す
            const target = (await mgr.loadSilenceDictionary('s1')).lines.find((l) => l.userId === 'u1');

            await mgr.postSilenceDelete(del('s1', target.id));

            (await mgr.loadSilenceDictionary('s1')).lines.map((l) => l.userId).should.deep.equal(['u2']);
            const [doc] = await findDocs({ id: 's1' });
            doc.users.map((r) => r[0]).should.deep.equal(['u2']);
        });

        specify('存在しない ID は disappointed で拒否する', async () => {
            const err = await new Manager().postSilenceDelete(del('s1', 'nope')).catch((e) => e);
            err.should.have.property('type', 'disappointed');
        });
    });

    describe('#postSilenceClear', () => {
        specify('辞書を空にして永続化する', async () => {
            const mgr = new Manager();
            await mgr.postSilenceCreate(create('s1', 'u1'));
            await mgr.postSilenceClear(clear('s1'));

            (await mgr.loadSilenceDictionary('s1')).lines.should.have.lengthOf(0);
            const [doc] = await findDocs({ id: 's1' });
            doc.users.should.deep.equal([]);
        });

        specify('すでに空なら disappointed で拒否する', async () => {
            const err = await new Manager().postSilenceClear(clear('s1')).catch((e) => e);
            should.exist(err);
            err.should.have.property('type', 'disappointed');
        });
    });
});

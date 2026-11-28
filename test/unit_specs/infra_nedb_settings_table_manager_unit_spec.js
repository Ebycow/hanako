require('chai').should();
const { loadWithInMemoryNedb } = require('../helpers/in_memory_nedb');
const Settings = require('../../src/domain/entity/settings');
const MaxCountUpdateAction = require('../../src/domain/entity/actions/max_count_update_action');
const SpeakerUpdateAction = require('../../src/domain/entity/actions/speaker_update_action');
const SeNormalizeUpdateAction = require('../../src/domain/entity/actions/se_normalize_update_action');
const TextCommandsUpdateAction = require('../../src/domain/entity/actions/text_commands_update_action');

/************************************************************************
 * NedbSettingsTableManager コントラクトテスト
 *
 * 方針：NeDB を in-memory で動かし、設定の初期値・マイグレーション・更新の永続化を実物で保証する。
 ***********************************************************************/

describe('NedbSettingsTableManager', () => {
    let Manager;
    let instances;

    function load() {
        ({ Manager, instances } = loadWithInMemoryNedb('../../src/infra/nedb/nedb_settings_table_manager', {
            '../../domain/repo/i_settings_repo': { comprise() {} },
            '../../domain/repo/i_settings_action_repo': { comprise() {} },
        }));
    }

    /** AppSettings のうち、このマネージャが読むものだけを持つ偽物 */
    const appSettings = (foleyNormalizeTargetPeak) => ({ foleyNormalizeTargetPeak });

    async function findDoc(serverId) {
        const docs = await instances[0].findAsync({ id: serverId });
        docs.should.have.lengthOf(1);
        return docs[0];
    }

    beforeEach(() => load());

    describe('#loadSettings', () => {
        specify('未登録のサーバーは初期値の設定を作って返す', async () => {
            const mgr = new Manager(appSettings(0.7));
            const settings = await mgr.loadSettings('s1');

            settings.should.be.an.instanceOf(Settings);
            settings.serverId.should.equal('s1');
            settings.id.should.be.a('string').and.not.equal('s1');
            settings.maxCount.should.equal(0);
            settings.speaker.should.deep.equal({ default: 'default' });
            settings.seNormalize.should.equal(0.7);
            settings.textCommands.should.equal(true);

            const doc = await findDoc('s1');
            doc.dict.seNormalize.should.equal(0.7);
        });

        specify('foleyNormalizeTargetPeak が未設定なら SE 正規化の初期値は 0.5', async () => {
            const settings = await new Manager(appSettings(undefined)).loadSettings('s1');
            settings.seNormalize.should.equal(0.5);
        });

        specify('foleyNormalizeTargetPeak が 0 なら 0 をそのまま使う', async () => {
            const settings = await new Manager(appSettings(0)).loadSettings('s1');
            settings.seNormalize.should.equal(0);
        });

        specify('同じ ID で 2 回読んでも同じ設定 ID を返す', async () => {
            const mgr = new Manager(appSettings(0.5));
            const a = await mgr.loadSettings('s1');
            const b = await mgr.loadSettings('s1');
            a.id.should.equal(b.id);
        });

        specify('未登録のサーバーを同時に読み込んでも、ドキュメントは 1 件しか作らず同じ設定 ID を返す', async () => {
            const mgr = new Manager(appSettings(0.5));
            const [a, b] = await Promise.all([mgr.loadSettings('s1'), mgr.loadSettings('s1')]);
            a.id.should.equal(b.id);

            const doc = await findDoc('s1');
            doc.dict.id.should.equal(a.id);
        });

        specify('既存のドキュメントから設定を復元する', async () => {
            const mgr = new Manager(appSettings(0.5));
            await instances[0].insertAsync({
                id: 's1',
                dict: {
                    id: 'rec',
                    serverId: 's1',
                    maxCount: 42,
                    speaker: { default: 'x', u1: 'y' },
                    seNormalize: 0.3,
                    textCommands: false,
                },
            });

            const settings = await mgr.loadSettings('s1');
            settings.id.should.equal('rec');
            settings.maxCount.should.equal(42);
            settings.speaker.should.deep.equal({ default: 'x', u1: 'y' });
            settings.seNormalize.should.equal(0.3);
            settings.textCommands.should.equal(false);
        });

        specify('話者が文字列の古いレコードは、話者の指定をデフォルトに戻す', async () => {
            const mgr = new Manager(appSettings(0.5));
            await instances[0].insertAsync({
                id: 's1',
                dict: { id: 'rec', serverId: 's1', maxCount: 0, speaker: 'takumi', seNormalize: 0.5 },
            });
            const settings = await mgr.loadSettings('s1');
            settings.speaker.should.deep.equal({ default: 'default' });
        });

        specify('seNormalize を持たない古いレコードには、全体設定の値を補う', async () => {
            const mgr = new Manager(appSettings(0.8));
            await instances[0].insertAsync({
                id: 's1',
                dict: { id: 'rec', serverId: 's1', maxCount: 0, speaker: { default: 'default' } },
            });
            const settings = await mgr.loadSettings('s1');
            settings.seNormalize.should.equal(0.8);
        });

        specify('textCommands を持たない古いレコードは、テキストコマンドを使える状態として扱う', async () => {
            const mgr = new Manager(appSettings(0.5));
            await instances[0].insertAsync({
                id: 's1',
                dict: { id: 'rec', serverId: 's1', maxCount: 0, speaker: { default: 'default' }, seNormalize: 0.5 },
            });
            (await mgr.loadSettings('s1')).textCommands.should.equal(true);
        });
    });

    describe('更新系', () => {
        let mgr;
        beforeEach(() => {
            mgr = new Manager(appSettings(0.5));
        });

        specify('#postMaxCountUpdate は最大読み上げ文字数を更新して永続化する', async () => {
            await mgr.postMaxCountUpdate(new MaxCountUpdateAction({ id: 'a', serverId: 's1', maxCount: 120 }));
            (await mgr.loadSettings('s1')).maxCount.should.equal(120);
            (await findDoc('s1')).dict.maxCount.should.equal(120);
        });

        specify('#postSpeakerUpdate はユーザーごとの話者を追加し、ほかの指定を残す', async () => {
            await mgr.postSpeakerUpdate(
                new SpeakerUpdateAction({ id: 'a', serverId: 's1', userId: 'u1', speaker: 'zundamon' })
            );
            await mgr.postSpeakerUpdate(
                new SpeakerUpdateAction({ id: 'a', serverId: 's1', userId: 'default', speaker: 'metan' })
            );

            const expected = { default: 'metan', u1: 'zundamon' };
            (await mgr.loadSettings('s1')).speaker.should.deep.equal(expected);
            (await findDoc('s1')).dict.speaker.should.deep.equal(expected);
        });

        specify('#postSeNormalizeUpdate は SE 正規化レベルを更新して永続化する', async () => {
            await mgr.postSeNormalizeUpdate(new SeNormalizeUpdateAction({ id: 'a', serverId: 's1', seNormalize: 0 }));
            (await mgr.loadSettings('s1')).seNormalize.should.equal(0);
            (await findDoc('s1')).dict.seNormalize.should.equal(0);
        });

        specify('#postTextCommandsUpdate はテキストコマンドの可否を更新して永続化する', async () => {
            await mgr.postTextCommandsUpdate(new TextCommandsUpdateAction({ id: 'a', serverId: 's1', enabled: false }));
            (await mgr.loadSettings('s1')).textCommands.should.equal(false);
            (await findDoc('s1')).dict.textCommands.should.equal(false);

            await mgr.postTextCommandsUpdate(new TextCommandsUpdateAction({ id: 'a', serverId: 's1', enabled: true }));
            (await mgr.loadSettings('s1')).textCommands.should.equal(true);
        });

        specify('ある項目の更新は、ほかの項目を変えない', async () => {
            await mgr.postMaxCountUpdate(new MaxCountUpdateAction({ id: 'a', serverId: 's1', maxCount: 10 }));
            await mgr.postSeNormalizeUpdate(new SeNormalizeUpdateAction({ id: 'a', serverId: 's1', seNormalize: 1 }));
            const s = await mgr.loadSettings('s1');
            s.maxCount.should.equal(10);
            s.seNormalize.should.equal(1);
            s.speaker.should.deep.equal({ default: 'default' });
        });

        specify('更新はサーバーごとに分かれる', async () => {
            await mgr.postMaxCountUpdate(new MaxCountUpdateAction({ id: 'a', serverId: 's1', maxCount: 10 }));
            (await mgr.loadSettings('s2')).maxCount.should.equal(0);
        });
    });
});

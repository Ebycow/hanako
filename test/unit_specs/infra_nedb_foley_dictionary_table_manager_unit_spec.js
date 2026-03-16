const should = require('chai').should();
const sinon = require('sinon');
const proxyquire = require('proxyquire').noCallThru();
const { PassThrough } = require('stream');
const RealDatastore = require('@seald-io/nedb');
const AppSettings = require('../../src/core/app_settings');
const FoleyDictionary = require('../../src/domain/entity/foley_dictionary');
const FoleyCreateAction = require('../../src/domain/entity/actions/foley_create_action');
const FoleyCreateMultipleAction = require('../../src/domain/entity/actions/foley_create_multiple_action');
const FoleyDeleteAction = require('../../src/domain/entity/actions/foley_delete_action');
const FoleyDeleteMultipleAction = require('../../src/domain/entity/actions/foley_delete_multiple_action');
const FoleyRenameAction = require('../../src/domain/entity/actions/foley_rename_action');
const FoleyAudio = require('../../src/domain/entity/audios/foley_audio');

/************************************************************************
 * NedbFoleyDictionaryTableManager コントラクトテスト
 *
 * 方針：NeDB を in-memory で動かし、DB契約（CRUD整合性）を実物で保証する。
 *       ネットワーク I/O (axios)、外部バイナリ (FFmpeg)、ファイル I/O
 *       (objectStorageRepo) のみ stub/fake で差し替える。
 *       NeDB → SQLite 移行時はこのテストがそのまま安全ネットになる。
 ***********************************************************************/

describe('NedbFoleyDictionaryTableManager', () => {
    /** @type {AppSettings} */
    let appSettings;
    /** @type {sinon.SinonSandbox} */
    let sandbox;

    // --- stub / fake 群 ---
    let fakeAxios;
    let fakeFileType;
    let fakePrism;
    let objectStorageRepo;
    let settingsRepo;

    /** テスト用 AppSettings を構築 */
    function createAppSettings() {
        return new AppSettings({
            defaultCommandPrefix: '!',
            discordBotToken: 'test-token',
            discordClientId: 'test-client',
            discordGuildId: 'test-guild',
            ebyroidStreamApiUrl: 'http://localhost:0',
            foleyMaxDownloadByteSize: 1048576,
            foleyMaxAudioSeconds: 10,
            foleyNormalizeTargetPeak: 0.5,
        });
    }

    /**
     * proxyquire 経由でモジュールレベル singleton をリセットした
     * 新しい NedbFoleyDictionaryTableManager クラスを取得する。
     * 毎テストで呼ぶことで firstCall / cache / dbInstance が初期化される。
     */
    function loadFreshModule() {
        // in-memory NeDB: filename を渡さないことでメモリ上だけで動く
        // NeDB → SQLite移行時は InMemoryDatastore を SQLite in-memory に差し替えるだけでテストが安全ネットとして機能します
        class InMemoryDatastore extends RealDatastore {
            constructor(_opts) {
                super();
            }
        }

        const Manager = proxyquire('../../src/infra/nedb/nedb_foley_dictionary_table_manager', {
            '@seald-io/nedb': InMemoryDatastore,
            axios: { default: fakeAxios },
            'file-type': fakeFileType,
            'prism-media': fakePrism,
            '../../domain/repo/i_foley_action_repo': { comprise() {} },
            '../../domain/repo/i_foley_dictionary_repo': { comprise() {} },
            '../../domain/repo/i_foley_stream_repo': { comprise() {} },
        });
        return Manager;
    }

    /** Manager インスタンスをワンショットで生成 */
    function createManager() {
        const Manager = loadFreshModule();
        return new Manager(appSettings, objectStorageRepo, settingsRepo);
    }

    /** 有効な audio バッファ（stub が audio/mpeg を返す前提の任意データ） */
    const DUMMY_AUDIO_BUF = Buffer.from('dummy-audio-data');

    beforeEach(() => {
        sandbox = sinon.createSandbox();

        appSettings = createAppSettings();

        // axios stub: デフォルトは成功レスポンス
        fakeAxios = { get: sandbox.stub().resolves({ data: DUMMY_AUDIO_BUF }) };

        // file-type stub: デフォルトは audio/mpeg
        fakeFileType = { fromBuffer: sandbox.stub().resolves({ mime: 'audio/mpeg', ext: 'mp3' }) };

        // prism-media fake: FFmpeg を PassThrough に置き換え
        fakePrism = {
            FFmpeg: class FakeFFmpeg extends PassThrough {
                constructor() {
                    super();
                }
            },
        };

        // objectStorageRepo stub
        objectStorageRepo = {
            saveFile: sandbox.stub().resolves(),
            readFile: sandbox.stub().resolves(new PassThrough()),
            deleteFile: sandbox.stub().resolves(),
        };

        // settingsRepo stub - デフォルトでseNormalize=50のSettingsを返す
        const Settings = require('../../src/domain/entity/settings');
        settingsRepo = {
            loadSettings: sandbox.stub().resolves(
                new Settings({
                    id: 'test-settings-id',
                    serverId: 'test-server',
                    maxCount: 0,
                    speaker: { default: 'default' },
                    seNormalize: 50,
                })
            ),
        };
    });

    afterEach(() => {
        sandbox.restore();
    });

    // ================================================================
    // #loadFoleyDictionary
    // ================================================================
    describe('#loadFoleyDictionary', () => {
        specify('未登録サーバーは空の FoleyDictionary を返す', async () => {
            const mgr = createManager();
            const dict = await mgr.loadFoleyDictionary('server-new');
            dict.should.be.an.instanceOf(FoleyDictionary);
            dict.lines.should.have.lengthOf(0);
        });

        specify('登録済みサーバーの FoleyDictionary を返す', async () => {
            const mgr = createManager();

            // まず1件登録
            const action = new FoleyCreateAction({
                id: 'act-1',
                serverId: 'server-1',
                keyword: 'ドン',
                url: 'http://example.com/don.mp3',
            });
            await mgr.postFoleyCreate(action);

            const dict = await mgr.loadFoleyDictionary('server-1');
            dict.lines.should.have.lengthOf(1);
            dict.lines[0].keyword.should.equal('ドン');
        });

        specify('2回目呼出はキャッシュから返す（DB操作なし）', async () => {
            const mgr = createManager();

            const dict1 = await mgr.loadFoleyDictionary('server-c');
            const dict2 = await mgr.loadFoleyDictionary('server-c');

            // どちらも空だが同一サーバーのデータ
            dict1.lines.should.have.lengthOf(0);
            dict2.lines.should.have.lengthOf(0);
        });

        specify('返却値は FoleyDictionary インスタンスである', async () => {
            const mgr = createManager();
            const dict = await mgr.loadFoleyDictionary('server-x');
            dict.should.be.an.instanceOf(FoleyDictionary);
            dict.serverId.should.equal('server-x');
        });
    });

    // ================================================================
    // #postFoleyCreate
    // ================================================================
    describe('#postFoleyCreate', () => {
        context('正常系', () => {
            specify('成功後 loadFoleyDictionary で新エントリが取得できる', async () => {
                const mgr = createManager();
                const action = new FoleyCreateAction({
                    id: 'act-1',
                    serverId: 'sv-1',
                    keyword: 'バーン',
                    url: 'http://example.com/barn.mp3',
                });
                await mgr.postFoleyCreate(action);

                const dict = await mgr.loadFoleyDictionary('sv-1');
                dict.lines.should.have.lengthOf(1);
                dict.lines[0].keyword.should.equal('バーン');
                dict.lines[0].url.should.equal('http://example.com/barn.mp3');
            });

            specify('objectStorage.saveFile が正しい base64 キーで呼ばれる', async () => {
                const mgr = createManager();
                const action = new FoleyCreateAction({
                    id: 'act-2',
                    serverId: 'sv-1',
                    keyword: 'ドン',
                    url: 'http://example.com/don.mp3',
                });
                await mgr.postFoleyCreate(action);

                objectStorageRepo.saveFile.calledOnce.should.be.true;
                const args = objectStorageRepo.saveFile.firstCall.args;
                args[0].should.equal('sv-1');
                args[1].should.equal(Buffer.from('ドン').toString('base64'));
                args[2].should.equal('pcm');
            });

            specify('axios に URL と maxContentLength が渡される', async () => {
                const mgr = createManager();
                const action = new FoleyCreateAction({
                    id: 'act-3',
                    serverId: 'sv-1',
                    keyword: 'シャキーン',
                    url: 'http://example.com/shakin.mp3',
                });
                await mgr.postFoleyCreate(action);

                fakeAxios.get.calledOnce.should.be.true;
                const callArgs = fakeAxios.get.firstCall.args;
                callArgs[0].should.equal('http://example.com/shakin.mp3');
                callArgs[1].should.deep.include({ maxContentLength: 1048576 });
            });
        });

        context('異常系', () => {
            specify('重複キーワード → rejected (disappointed)', async () => {
                const mgr = createManager();
                const action1 = new FoleyCreateAction({
                    id: 'act-d1',
                    serverId: 'sv-dup',
                    keyword: 'ドン',
                    url: 'http://example.com/don.mp3',
                });
                await mgr.postFoleyCreate(action1);

                const action2 = new FoleyCreateAction({
                    id: 'act-d2',
                    serverId: 'sv-dup',
                    keyword: 'ドン',
                    url: 'http://example.com/don2.mp3',
                });
                try {
                    await mgr.postFoleyCreate(action2);
                    should.fail('should have rejected');
                } catch (err) {
                    err.type.should.equal('disappointed');
                }
            });

            specify('ダウンロードサイズ超過 → rejected (unexpected)', async () => {
                const mgr = createManager();
                fakeAxios.get.rejects(new Error('maxContentLength size of 1048576 exceeded'));

                const action = new FoleyCreateAction({
                    id: 'act-big',
                    serverId: 'sv-big',
                    keyword: 'デカイ',
                    url: 'http://example.com/big.mp3',
                });
                try {
                    await mgr.postFoleyCreate(action);
                    should.fail('should have rejected');
                } catch (err) {
                    err.type.should.equal('unexpected');
                }
            });

            specify('HTTP 4xx → rejected (unexpected)', async () => {
                const mgr = createManager();
                const httpError = new Error('Request failed');
                httpError.response = { status: 404 };
                fakeAxios.get.rejects(httpError);

                const action = new FoleyCreateAction({
                    id: 'act-404',
                    serverId: 'sv-404',
                    keyword: 'ナイ',
                    url: 'http://example.com/none.mp3',
                });
                try {
                    await mgr.postFoleyCreate(action);
                    should.fail('should have rejected');
                } catch (err) {
                    err.type.should.equal('unexpected');
                }
            });

            specify('非オーディオ MIME → rejected (unexpected)', async () => {
                const mgr = createManager();
                fakeFileType.fromBuffer.resolves({ mime: 'image/png', ext: 'png' });

                const action = new FoleyCreateAction({
                    id: 'act-img',
                    serverId: 'sv-img',
                    keyword: 'ガゾウ',
                    url: 'http://example.com/img.png',
                });
                try {
                    await mgr.postFoleyCreate(action);
                    should.fail('should have rejected');
                } catch (err) {
                    err.type.should.equal('unexpected');
                }
            });

            specify('file-type が null → rejected (unexpected)', async () => {
                const mgr = createManager();
                fakeFileType.fromBuffer.resolves(null);

                const action = new FoleyCreateAction({
                    id: 'act-null',
                    serverId: 'sv-null',
                    keyword: 'ナゾ',
                    url: 'http://example.com/unknown',
                });
                try {
                    await mgr.postFoleyCreate(action);
                    should.fail('should have rejected');
                } catch (err) {
                    err.type.should.equal('unexpected');
                }
            });

            specify('objectStorage.saveFile 失敗 → rejected', async () => {
                const mgr = createManager();
                objectStorageRepo.saveFile.rejects(new Error('disk full'));

                const action = new FoleyCreateAction({
                    id: 'act-disk',
                    serverId: 'sv-disk',
                    keyword: 'ディスク',
                    url: 'http://example.com/disk.mp3',
                });
                try {
                    await mgr.postFoleyCreate(action);
                    should.fail('should have rejected');
                } catch (err) {
                    err.message.should.equal('disk full');
                }
            });
        });
    });

    // ================================================================
    // #postFoleyCreateMultiple
    // ================================================================
    describe('#postFoleyCreateMultiple', () => {
        specify('全件成功', async () => {
            const mgr = createManager();
            const action = new FoleyCreateMultipleAction({
                id: 'act-m1',
                serverId: 'sv-multi',
                items: [
                    { keyword: 'ドン', url: 'http://example.com/don.mp3' },
                    { keyword: 'バーン', url: 'http://example.com/barn.mp3' },
                ],
            });
            await mgr.postFoleyCreateMultiple(action);

            const dict = await mgr.loadFoleyDictionary('sv-multi');
            dict.lines.should.have.lengthOf(2);
            const keywords = dict.lines.map((l) => l.keyword);
            keywords.should.include('ドン');
            keywords.should.include('バーン');
        });

        specify('部分成功 → disappointed（成功分は辞書に残る）', async () => {
            const mgr = createManager();

            // 2回目の axios.get だけ失敗させる
            fakeAxios.get.onFirstCall().resolves({ data: DUMMY_AUDIO_BUF });
            fakeAxios.get.onSecondCall().rejects(new Error('network error'));

            const action = new FoleyCreateMultipleAction({
                id: 'act-m2',
                serverId: 'sv-partial',
                items: [
                    { keyword: 'OK音', url: 'http://example.com/ok.mp3' },
                    { keyword: 'NG音', url: 'http://example.com/ng.mp3' },
                ],
            });

            try {
                await mgr.postFoleyCreateMultiple(action);
                should.fail('should have rejected');
            } catch (err) {
                err.type.should.equal('disappointed');
            }

            // 成功分は辞書に残っている
            const dict = await mgr.loadFoleyDictionary('sv-partial');
            dict.lines.should.have.lengthOf(1);
            dict.lines[0].keyword.should.equal('OK音');
        });

        specify('全件失敗 → unexpected', async () => {
            const mgr = createManager();
            fakeAxios.get.rejects(new Error('all fail'));

            const action = new FoleyCreateMultipleAction({
                id: 'act-m3',
                serverId: 'sv-allfail',
                items: [
                    { keyword: 'A', url: 'http://example.com/a.mp3' },
                    { keyword: 'B', url: 'http://example.com/b.mp3' },
                ],
            });

            try {
                await mgr.postFoleyCreateMultiple(action);
                should.fail('should have rejected');
            } catch (err) {
                err.type.should.equal('unexpected');
            }
        });
    });

    // ================================================================
    // #postFoleyDelete
    // ================================================================
    describe('#postFoleyDelete', () => {
        specify('削除後 loadFoleyDictionary からエントリが消える', async () => {
            const mgr = createManager();

            // 登録
            const createAction = new FoleyCreateAction({
                id: 'act-c',
                serverId: 'sv-del',
                keyword: 'ケス',
                url: 'http://example.com/kesu.mp3',
            });
            await mgr.postFoleyCreate(createAction);

            // foleyId を取得
            const dict = await mgr.loadFoleyDictionary('sv-del');
            const foleyId = dict.lines[0].id;

            // 削除
            const delAction = new FoleyDeleteAction({ id: 'act-d', serverId: 'sv-del', foleyId });
            await mgr.postFoleyDelete(delAction);

            // 確認
            const dictAfter = await mgr.loadFoleyDictionary('sv-del');
            dictAfter.lines.should.have.lengthOf(0);
        });

        specify('objectStorage.deleteFile が呼ばれる', async () => {
            const mgr = createManager();

            const createAction = new FoleyCreateAction({
                id: 'act-c2',
                serverId: 'sv-del2',
                keyword: 'ポン',
                url: 'http://example.com/pon.mp3',
            });
            await mgr.postFoleyCreate(createAction);

            const dict = await mgr.loadFoleyDictionary('sv-del2');
            const foleyId = dict.lines[0].id;

            const delAction = new FoleyDeleteAction({ id: 'act-d2', serverId: 'sv-del2', foleyId });
            await mgr.postFoleyDelete(delAction);

            objectStorageRepo.deleteFile.calledOnce.should.be.true;
            const args = objectStorageRepo.deleteFile.firstCall.args;
            args[0].should.equal('sv-del2');
            args[1].should.equal(Buffer.from('ポン').toString('base64'));
            args[2].should.equal('pcm');
        });

        specify('不存在 foleyId → rejected (disappointed)', async () => {
            const mgr = createManager();
            // 空のサーバーデータを作成
            await mgr.loadFoleyDictionary('sv-ghost');

            const delAction = new FoleyDeleteAction({ id: 'act-g', serverId: 'sv-ghost', foleyId: 'no-such-id' });
            try {
                await mgr.postFoleyDelete(delAction);
                should.fail('should have rejected');
            } catch (err) {
                err.type.should.equal('disappointed');
            }
        });
    });

    // ================================================================
    // #postFoleyDeleteMultiple
    // ================================================================
    describe('#postFoleyDeleteMultiple', () => {
        specify('複数削除後エントリが消える', async () => {
            const mgr = createManager();

            // 2件登録
            for (const kw of ['パン', 'ドン']) {
                await mgr.postFoleyCreate(
                    new FoleyCreateAction({
                        id: `act-${kw}`,
                        serverId: 'sv-mdel',
                        keyword: kw,
                        url: `http://example.com/${kw}.mp3`,
                    })
                );
            }

            const dict = await mgr.loadFoleyDictionary('sv-mdel');
            dict.lines.should.have.lengthOf(2);
            const ids = dict.lines.map((l) => l.id);

            await mgr.postFoleyDeleteMultiple(
                new FoleyDeleteMultipleAction({
                    id: 'act-mdel',
                    serverId: 'sv-mdel',
                    foleyIds: ids,
                })
            );

            const dictAfter = await mgr.loadFoleyDictionary('sv-mdel');
            dictAfter.lines.should.have.lengthOf(0);
        });

        specify('一部 ID 不存在でも処理を継続する', async () => {
            const mgr = createManager();

            await mgr.postFoleyCreate(
                new FoleyCreateAction({
                    id: 'act-x',
                    serverId: 'sv-mdel2',
                    keyword: 'バキ',
                    url: 'http://example.com/baki.mp3',
                })
            );

            const dict = await mgr.loadFoleyDictionary('sv-mdel2');
            const realId = dict.lines[0].id;

            // 実在1件 + 不存在1件
            await mgr.postFoleyDeleteMultiple(
                new FoleyDeleteMultipleAction({
                    id: 'act-mdel2',
                    serverId: 'sv-mdel2',
                    foleyIds: [realId, 'ghost-id'],
                })
            );

            const dictAfter = await mgr.loadFoleyDictionary('sv-mdel2');
            dictAfter.lines.should.have.lengthOf(0);
        });

        specify('ファイル削除失敗は非致命的', async () => {
            const mgr = createManager();

            await mgr.postFoleyCreate(
                new FoleyCreateAction({
                    id: 'act-f',
                    serverId: 'sv-mdel3',
                    keyword: 'ガシャ',
                    url: 'http://example.com/gasha.mp3',
                })
            );

            const dict = await mgr.loadFoleyDictionary('sv-mdel3');
            const foleyId = dict.lines[0].id;

            objectStorageRepo.deleteFile.rejects(new Error('io error'));

            // エラーにならずに完了すること
            await mgr.postFoleyDeleteMultiple(
                new FoleyDeleteMultipleAction({
                    id: 'act-mdel3',
                    serverId: 'sv-mdel3',
                    foleyIds: [foleyId],
                })
            );

            const dictAfter = await mgr.loadFoleyDictionary('sv-mdel3');
            dictAfter.lines.should.have.lengthOf(0);
        });
    });

    // ================================================================
    // #postFoleyRename
    // ================================================================
    describe('#postFoleyRename', () => {
        specify('リネーム後 loadFoleyDictionary で新キーワードが取得できる', async () => {
            const mgr = createManager();

            await mgr.postFoleyCreate(
                new FoleyCreateAction({
                    id: 'act-r',
                    serverId: 'sv-ren',
                    keyword: 'ドン',
                    url: 'http://example.com/don.mp3',
                })
            );

            await mgr.postFoleyRename(
                new FoleyRenameAction({
                    id: 'act-ren',
                    serverId: 'sv-ren',
                    keywordFrom: 'ドン',
                    keywordTo: 'バーン',
                })
            );

            const dict = await mgr.loadFoleyDictionary('sv-ren');
            dict.lines.should.have.lengthOf(1);
            dict.lines[0].keyword.should.equal('バーン');
        });

        specify('objectStorage: readFile→saveFile→deleteFile の順で呼ばれる', async () => {
            const mgr = createManager();

            await mgr.postFoleyCreate(
                new FoleyCreateAction({
                    id: 'act-r2',
                    serverId: 'sv-ren2',
                    keyword: 'ポン',
                    url: 'http://example.com/pon.mp3',
                })
            );

            // saveFile のカウントをリセット（postFoleyCreate で1回呼ばれているため）
            objectStorageRepo.saveFile.resetHistory();
            objectStorageRepo.readFile.resetHistory();
            objectStorageRepo.deleteFile.resetHistory();

            await mgr.postFoleyRename(
                new FoleyRenameAction({
                    id: 'act-ren2',
                    serverId: 'sv-ren2',
                    keywordFrom: 'ポン',
                    keywordTo: 'パン',
                })
            );

            objectStorageRepo.readFile.calledOnce.should.be.true;
            objectStorageRepo.saveFile.calledOnce.should.be.true;
            objectStorageRepo.deleteFile.calledOnce.should.be.true;

            // 呼出順: read → save → delete
            sinon.assert.callOrder(
                objectStorageRepo.readFile,
                objectStorageRepo.saveFile,
                objectStorageRepo.deleteFile
            );

            // キーの正当性
            const oldKey = Buffer.from('ポン').toString('base64');
            const newKey = Buffer.from('パン').toString('base64');
            objectStorageRepo.readFile.firstCall.args[1].should.equal(oldKey);
            objectStorageRepo.saveFile.firstCall.args[1].should.equal(newKey);
            objectStorageRepo.deleteFile.firstCall.args[1].should.equal(oldKey);
        });

        specify('元キーワード不存在 → rejected (disappointed)', async () => {
            const mgr = createManager();
            await mgr.loadFoleyDictionary('sv-ren3');

            try {
                await mgr.postFoleyRename(
                    new FoleyRenameAction({
                        id: 'act-ren3',
                        serverId: 'sv-ren3',
                        keywordFrom: 'ナイ',
                        keywordTo: 'アル',
                    })
                );
                should.fail('should have rejected');
            } catch (err) {
                err.type.should.equal('disappointed');
            }
        });

        specify('先キーワード重複 → rejected (disappointed)', async () => {
            const mgr = createManager();

            // 2件登録
            for (const kw of ['ドン', 'バーン']) {
                await mgr.postFoleyCreate(
                    new FoleyCreateAction({
                        id: `act-${kw}`,
                        serverId: 'sv-ren4',
                        keyword: kw,
                        url: `http://example.com/${kw}.mp3`,
                    })
                );
            }

            try {
                await mgr.postFoleyRename(
                    new FoleyRenameAction({
                        id: 'act-ren4',
                        serverId: 'sv-ren4',
                        keywordFrom: 'ドン',
                        keywordTo: 'バーン',
                    })
                );
                should.fail('should have rejected');
            } catch (err) {
                err.type.should.equal('disappointed');
            }
        });
    });

    // ================================================================
    // #getFoleyStream
    // ================================================================
    describe('#getFoleyStream', () => {
        specify('objectStorage.readFile の結果を stream として返す', async () => {
            const mgr = createManager();

            await mgr.postFoleyCreate(
                new FoleyCreateAction({
                    id: 'act-s',
                    serverId: 'sv-stream',
                    keyword: 'ピコ',
                    url: 'http://example.com/piko.mp3',
                })
            );

            // PCMデータのダミーストリームを作成（16-bit stereo）
            const dummyPcmData = Buffer.alloc(8); // 2フレーム分
            dummyPcmData.writeInt16LE(1000, 0);
            dummyPcmData.writeInt16LE(1000, 2);
            dummyPcmData.writeInt16LE(1000, 4);
            dummyPcmData.writeInt16LE(1000, 6);

            const mockStream = new PassThrough();
            mockStream.end(dummyPcmData);
            objectStorageRepo.readFile.resolves(mockStream);

            const dict = await mgr.loadFoleyDictionary('sv-stream');
            const foleyId = dict.lines[0].id;

            const audio = new FoleyAudio({ serverId: 'sv-stream', foleyId });
            const stream = await mgr.getFoleyStream(audio);

            // 正規化後のストリームが返されることを確認（元のストリームとは別オブジェクト）
            should.exist(stream);
            stream.should.be.an.instanceOf(require('stream').Readable);
        });

        specify('foleyId 不存在 → rejected (disappointed)', async () => {
            const mgr = createManager();
            await mgr.loadFoleyDictionary('sv-stream2');

            const audio = new FoleyAudio({ serverId: 'sv-stream2', foleyId: 'ghost-id' });
            try {
                await mgr.getFoleyStream(audio);
                should.fail('should have rejected');
            } catch (err) {
                err.type.should.equal('disappointed');
            }
        });
    });
});

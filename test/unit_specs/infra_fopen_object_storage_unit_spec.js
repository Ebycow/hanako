require('chai').should();
const fs = require('fs');
const os = require('os');
const path = require('path');
const { Readable } = require('stream');
const { loadWithInMemoryNedb } = require('../helpers/in_memory_nedb');

/************************************************************************
 * FopenObjectStorage コントラクトテスト
 *
 * 方針：NeDB は in-memory、ファイルは一時ディレクトリに実際に書く。
 *       実装は ./files/... というカレントディレクトリ基準のパスを使うため、
 *       各テストの間だけ一時ディレクトリへ chdir する。
 ***********************************************************************/

describe('FopenObjectStorage', () => {
    const originalCwd = process.cwd();
    let tmpDir;
    let Storage;
    let instances;

    function load(seed) {
        ({ Manager: Storage, instances } = loadWithInMemoryNedb(
            '../../src/infra/fopen/fopen_object_storage',
            { '../../domain/repo/i_object_storage_repo': { comprise() {} } },
            { seed }
        ));
    }

    /** 初期化（_key マイグレーションとユニーク制約の作成）が終わるのを待ってからストレージを返す */
    async function createStorage() {
        const storage = new Storage();
        // 初期化処理は投げっぱなしなので、ユニーク制約ができるまで待つ
        for (let i = 0; i < 50 && !instances[0].indexes._key; i++) {
            await new Promise((r) => setImmediate(r));
        }
        return storage;
    }

    const streamOf = (text) => Readable.from([Buffer.from(text)]);

    async function readAll(readable) {
        const chunks = [];
        for await (const c of readable) chunks.push(c);
        return Buffer.concat(chunks).toString();
    }

    function filesIn(segment, type) {
        const dir = path.join(tmpDir, 'files', segment, type);
        return fs.existsSync(dir) ? fs.readdirSync(dir) : [];
    }

    beforeEach(() => {
        tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'hanako-fopen-'));
        process.chdir(tmpDir);
        load();
    });

    afterEach(() => {
        process.chdir(originalCwd);
        fs.rmSync(tmpDir, { recursive: true, force: true });
    });

    describe('#saveFile / #readFile', () => {
        specify('保存したファイルを同じキーで読み戻せる', async () => {
            const storage = await createStorage();
            await storage.saveFile('g1', 'key1', 'wav', streamOf('hello'));

            (await readAll(await storage.readFile('g1', 'key1', 'wav'))).should.equal('hello');
            filesIn('g1', 'wav').should.have.lengthOf(1);
            filesIn('g1', 'wav')[0].should.match(/\.wav$/);
        });

        specify('セグメント・キー・種別のどれかが違えば別物として扱う', async () => {
            const storage = await createStorage();
            await storage.saveFile('g1', 'k', 'wav', streamOf('a'));
            await storage.saveFile('g2', 'k', 'wav', streamOf('b'));
            await storage.saveFile('g1', 'k2', 'wav', streamOf('c'));
            await storage.saveFile('g1', 'k', 'mp3', streamOf('d'));

            (await readAll(await storage.readFile('g1', 'k', 'wav'))).should.equal('a');
            (await readAll(await storage.readFile('g2', 'k', 'wav'))).should.equal('b');
            (await readAll(await storage.readFile('g1', 'k2', 'wav'))).should.equal('c');
            (await readAll(await storage.readFile('g1', 'k', 'mp3'))).should.equal('d');
        });

        specify('同じキーで保存し直すと disappointed で拒否し、書いたファイルは残さない', async () => {
            const storage = await createStorage();
            await storage.saveFile('g1', 'k', 'wav', streamOf('first'));

            const err = await storage.saveFile('g1', 'k', 'wav', streamOf('second')).catch((e) => e);

            err.should.have.property('type', 'disappointed');
            err.reason.should.equal('key-already-exists');
            filesIn('g1', 'wav').should.have.lengthOf(1);
            (await readAll(await storage.readFile('g1', 'k', 'wav'))).should.equal('first');
        });

        specify('入力ストリームが途中で失敗したら、書きかけのファイルもレコードも残さない', async () => {
            const storage = await createStorage();
            const broken = new Readable({
                read() {
                    this.push(Buffer.from('partial'));
                    this.destroy(new Error('network down'));
                },
            });

            const err = await storage.saveFile('g1', 'k', 'wav', broken).catch((e) => e);

            err.message.should.equal('network down');
            filesIn('g1', 'wav').should.have.lengthOf(0);
            (await instances[0].findAsync({ segment: 'g1' })).should.have.lengthOf(0);
        });

        specify('存在しないキーを読むと disappointed（record-not-found）', async () => {
            const storage = await createStorage();
            const err = await storage.readFile('g1', 'nope', 'wav').catch((e) => e);
            err.should.have.property('type', 'disappointed');
            err.reason.should.equal('record-not-found');
        });

        specify('レコードはあるのに実ファイルが消えていたら disappointed（file-not-found）', async () => {
            const storage = await createStorage();
            await storage.saveFile('g1', 'k', 'wav', streamOf('x'));
            fs.rmSync(path.join(tmpDir, 'files'), { recursive: true });

            const err = await storage.readFile('g1', 'k', 'wav').catch((e) => e);
            err.should.have.property('type', 'disappointed');
            err.reason.should.equal('file-not-found');
        });
    });

    describe('#deleteFile', () => {
        specify('ファイルとレコードを消し、同じキーで保存し直せる', async () => {
            const storage = await createStorage();
            await storage.saveFile('g1', 'k', 'wav', streamOf('x'));

            await storage.deleteFile('g1', 'k', 'wav');

            filesIn('g1', 'wav').should.have.lengthOf(0);
            (await storage.readFile('g1', 'k', 'wav').catch((e) => e)).reason.should.equal('record-not-found');
            await storage.saveFile('g1', 'k', 'wav', streamOf('again'));
            (await readAll(await storage.readFile('g1', 'k', 'wav'))).should.equal('again');
        });

        specify('ほかのキーのファイルは消さない', async () => {
            const storage = await createStorage();
            await storage.saveFile('g1', 'a', 'wav', streamOf('a'));
            await storage.saveFile('g1', 'b', 'wav', streamOf('b'));

            await storage.deleteFile('g1', 'a', 'wav');

            (await readAll(await storage.readFile('g1', 'b', 'wav'))).should.equal('b');
        });

        specify('存在しないキーは disappointed（record-not-found）', async () => {
            const storage = await createStorage();
            const err = await storage.deleteFile('g1', 'nope', 'wav').catch((e) => e);
            err.reason.should.equal('record-not-found');
        });

        specify('実ファイルが先に消えていても、レコードは消して成功する', async () => {
            const storage = await createStorage();
            await storage.saveFile('g1', 'k', 'wav', streamOf('x'));
            fs.rmSync(path.join(tmpDir, 'files'), { recursive: true });

            await storage.deleteFile('g1', 'k', 'wav');

            (await instances[0].findAsync({ segment: 'g1' })).should.have.lengthOf(0);
        });
    });

    describe('#getTotalSize', () => {
        specify('まだ何も保存していないセグメントは 0', async () => {
            const storage = await createStorage();
            (await storage.getTotalSize('g1', 'wav')).should.equal(0);
        });

        specify('セグメントと種別ごとに、保存したファイルのバイト数を合計する', async () => {
            const storage = await createStorage();
            await storage.saveFile('g1', 'a', 'wav', streamOf('12345'));
            await storage.saveFile('g1', 'b', 'wav', streamOf('123'));
            await storage.saveFile('g1', 'c', 'mp3', streamOf('1234567'));
            await storage.saveFile('g2', 'd', 'wav', streamOf('1'));

            (await storage.getTotalSize('g1', 'wav')).should.equal(8);
            (await storage.getTotalSize('g1', 'mp3')).should.equal(7);
            (await storage.getTotalSize('g2', 'wav')).should.equal(1);
        });

        specify('消したファイルは合計に含めない', async () => {
            const storage = await createStorage();
            await storage.saveFile('g1', 'a', 'wav', streamOf('12345'));
            await storage.saveFile('g1', 'b', 'wav', streamOf('123'));
            await storage.deleteFile('g1', 'a', 'wav');
            (await storage.getTotalSize('g1', 'wav')).should.equal(3);
        });
    });

    describe('起動時のマイグレーション', () => {
        specify('_key を持たない古いレコードに _key を付け、重複保存を拒否できるようにする', async () => {
            fs.mkdirSync(path.join(tmpDir, 'files', 'g1', 'wav'), { recursive: true });
            fs.writeFileSync(path.join(tmpDir, 'files', 'g1', 'wav', 'old.wav'), 'legacy');
            load([{ segment: 'g1', descriptive: 'k', suffix: 'wav', file: 'old' }]);

            const storage = await createStorage();

            const [doc] = await instances[0].findAsync({ segment: 'g1' });
            doc._key.should.equal('g1:k:wav');
            (await readAll(await storage.readFile('g1', 'k', 'wav'))).should.equal('legacy');
            const err = await storage.saveFile('g1', 'k', 'wav', streamOf('dup')).catch((e) => e);
            err.reason.should.equal('key-already-exists');
        });
    });
});

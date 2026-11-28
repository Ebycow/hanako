const should = require('chai').should();
const { loadWithInMemoryNedb } = require('../helpers/in_memory_nedb');
const WordDictionary = require('../../src/domain/entity/word_dictionary');
const WordCreateAction = require('../../src/domain/entity/actions/word_create_action');
const WordDeleteAction = require('../../src/domain/entity/actions/word_delete_action');
const WordClearAction = require('../../src/domain/entity/actions/word_clear_action');

/************************************************************************
 * NedbWordDictionaryTableManager コントラクトテスト
 *
 * 方針：NeDB を in-memory で動かし、教育単語の CRUD とキャッシュの整合性を実物で保証する。
 ***********************************************************************/

describe('NedbWordDictionaryTableManager', () => {
    let Manager;
    let instances;

    function load() {
        ({ Manager, instances } = loadWithInMemoryNedb('../../src/infra/nedb/nedb_word_dictionary_table_manager', {
            '../../domain/repo/i_word_action_repo': { comprise() {} },
            '../../domain/repo/i_word_dictionary_repo': { comprise() {} },
        }));
    }

    /** DB に保存されているドキュメントをそのまま取り出す */
    function findDocs(query) {
        return instances[0].findAsync(query);
    }

    const create = (serverId, from, to) => new WordCreateAction({ id: 'a', serverId, from, to });
    const del = (serverId, wordId) => new WordDeleteAction({ id: 'a', serverId, wordId });
    const clear = (serverId) => new WordClearAction({ id: 'a', serverId });

    beforeEach(() => load());

    describe('モジュールの初期化', () => {
        specify('インスタンスをいくつ作っても DB は一度だけ開く', () => {
            new Manager();
            new Manager();
            instances.should.have.lengthOf(1);
        });
    });

    describe('#loadWordDictionary', () => {
        specify('未登録のサーバーは空の辞書を返し、空のドキュメントを作る', async () => {
            const dict = await new Manager().loadWordDictionary('s1');
            dict.should.be.an.instanceOf(WordDictionary);
            dict.serverId.should.equal('s1');
            dict.lines.should.have.lengthOf(0);

            const docs = await findDocs({ id: 's1' });
            docs.should.have.lengthOf(1);
            docs[0].dict.should.deep.equal([]);
        });

        specify('既存のドキュメントから行を復元する', async () => {
            new Manager();
            await instances[0].insertAsync({ id: 's1', dict: [['花子', 'はなこ', 'w1']] });

            const dict = await new Manager().loadWordDictionary('s1');
            dict.lines.should.have.lengthOf(1);
            const line = dict.lines[0];
            line.id.should.equal('w1');
            line.dictId.should.equal('s1');
            line.from.should.equal('花子');
            line.to.should.equal('はなこ');
        });

        specify('ID を持たない古いレコードには ID を振り、読み直しても同じ ID になる', async () => {
            const mgr = new Manager();
            await instances[0].insertAsync({
                id: 's1',
                dict: [
                    ['a', 'b'],
                    ['c', 'd', 'keep'],
                ],
            });

            const first = await mgr.loadWordDictionary('s1');
            first.lines[0].id.should.be.a('string').and.not.be.empty;
            first.lines[1].id.should.equal('keep');

            const second = await mgr.loadWordDictionary('s1');
            second.lines[0].id.should.equal(first.lines[0].id);
        });

        specify('同じサーバーを同時に読み込んでもキャッシュは一つにまとまる', async () => {
            const mgr = new Manager();
            await Promise.all([mgr.loadWordDictionary('s1'), mgr.loadWordDictionary('s1')]);
            await mgr.postWordCreate(create('s1', 'x', 'y'));

            const dict = await mgr.loadWordDictionary('s1');
            dict.lines.map((l) => l.from).should.deep.equal(['x']);
        });

        specify('未登録のサーバーを同時に読み込んでも、ドキュメントは 1 件しか作らない', async () => {
            const mgr = new Manager();
            await Promise.all([mgr.loadWordDictionary('s1'), mgr.loadWordDictionary('s1')]);

            const docs = await findDocs({ id: 's1' });
            docs.should.have.lengthOf(1);
        });

        specify('DB の読み込みに失敗しても、次の読み込みでやり直せる', async () => {
            const mgr = new Manager();
            const db = instances[0];
            const originalFindOne = db.findOne;
            db.findOne = function (query, callback) {
                db.findOne = originalFindOne;
                callback(new Error('boom'));
            };

            const results = await Promise.allSettled([mgr.loadWordDictionary('s1'), mgr.loadWordDictionary('s1')]);
            results.map((r) => r.status).should.deep.equal(['rejected', 'rejected']);

            const dict = await mgr.loadWordDictionary('s1');
            dict.lines.should.have.lengthOf(0);
            (await findDocs({ id: 's1' })).should.have.lengthOf(1);
        });

        specify('返した辞書は、その後の追加の影響を受けない', async () => {
            const mgr = new Manager();
            const before = await mgr.loadWordDictionary('s1');
            await mgr.postWordCreate(create('s1', 'x', 'y'));
            before.lines.should.have.lengthOf(0);
        });

        specify('サーバーごとに辞書は分かれる', async () => {
            const mgr = new Manager();
            await mgr.postWordCreate(create('s1', 'x', 'y'));
            const other = await mgr.loadWordDictionary('s2');
            other.lines.should.have.lengthOf(0);
        });
    });

    describe('#postWordCreate', () => {
        specify('単語を追加して永続化する', async () => {
            const mgr = new Manager();
            await mgr.postWordCreate(create('s1', 'foo', 'ふー'));
            await mgr.postWordCreate(create('s1', 'bar', 'ばー'));

            const dict = await mgr.loadWordDictionary('s1');
            dict.lines
                .map((l) => [l.from, l.to])
                .should.deep.equal([
                    ['foo', 'ふー'],
                    ['bar', 'ばー'],
                ]);
            dict.lines[0].id.should.not.equal(dict.lines[1].id);

            const [doc] = await findDocs({ id: 's1' });
            doc.dict.map((r) => r[0]).should.deep.equal(['foo', 'bar']);
        });

        specify('同じ置換前単語がすでにあれば disappointed で拒否し、何も変えない', async () => {
            const mgr = new Manager();
            await mgr.postWordCreate(create('s1', 'foo', '1'));

            const err = await mgr.postWordCreate(create('s1', 'foo', '2')).catch((e) => e);
            err.should.have.property('type', 'disappointed');

            const dict = await mgr.loadWordDictionary('s1');
            dict.lines.map((l) => l.to).should.deep.equal(['1']);
        });

        specify('大文字小文字が違えば別の単語として追加できる', async () => {
            const mgr = new Manager();
            await mgr.postWordCreate(create('s1', 'Foo', '1'));
            await mgr.postWordCreate(create('s1', 'foo', '2'));
            (await mgr.loadWordDictionary('s1')).lines.should.have.lengthOf(2);
        });
    });

    describe('#postWordDelete', () => {
        specify('ID で指定した単語だけを消して永続化する', async () => {
            const mgr = new Manager();
            await mgr.postWordCreate(create('s1', 'a', '1'));
            await mgr.postWordCreate(create('s1', 'b', '2'));
            const target = (await mgr.loadWordDictionary('s1')).lines[0];

            await mgr.postWordDelete(del('s1', target.id));

            (await mgr.loadWordDictionary('s1')).lines.map((l) => l.from).should.deep.equal(['b']);
            const [doc] = await findDocs({ id: 's1' });
            doc.dict.map((r) => r[0]).should.deep.equal(['b']);
        });

        specify('存在しない ID は disappointed で拒否する', async () => {
            const mgr = new Manager();
            await mgr.postWordCreate(create('s1', 'a', '1'));
            const err = await mgr.postWordDelete(del('s1', 'nope')).catch((e) => e);
            err.should.have.property('type', 'disappointed');
            (await mgr.loadWordDictionary('s1')).lines.should.have.lengthOf(1);
        });

        specify('別サーバーの単語 ID では消せない', async () => {
            const mgr = new Manager();
            await mgr.postWordCreate(create('s1', 'a', '1'));
            const id = (await mgr.loadWordDictionary('s1')).lines[0].id;
            const err = await mgr.postWordDelete(del('s2', id)).catch((e) => e);
            err.should.have.property('type', 'disappointed');
        });
    });

    describe('#postWordClear', () => {
        specify('辞書を空にして永続化する', async () => {
            const mgr = new Manager();
            await mgr.postWordCreate(create('s1', 'a', '1'));
            await mgr.postWordCreate(create('s1', 'b', '2'));

            await mgr.postWordClear(clear('s1'));

            (await mgr.loadWordDictionary('s1')).lines.should.have.lengthOf(0);
            const [doc] = await findDocs({ id: 's1' });
            doc.dict.should.deep.equal([]);
        });

        specify('すでに空なら disappointed で拒否する', async () => {
            const err = await new Manager().postWordClear(clear('s1')).catch((e) => e);
            should.exist(err);
            err.should.have.property('type', 'disappointed');
        });
    });
});

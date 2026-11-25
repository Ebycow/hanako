const proxyquire = require('proxyquire').noCallThru();
const RealDatastore = require('@seald-io/nedb');

/**
 * ファイルに書かずメモリ上だけで動く NeDB を差し込んで、テーブルマネージャのモジュールを読み込み直す。
 *
 * テーブルマネージャはモジュールレベルに DB インスタンスとキャッシュを持つため、
 * proxyquire で毎回読み込み直すことでテストごとに初期状態へ戻す。
 * 生成された Datastore は `instances` に残るので、テストから直接中身を覗いたり、
 * 古い形式のレコードを事前に仕込んだりできる。
 *
 * @param {string} modulePath このファイルから見たモジュールのパス（test/unit_specs から見たときと同じ）
 * @param {object} [extraStubs] proxyquire に追加で渡すスタブ
 * @param {object} [options]
 * @param {Array<object>} [options.seed] DB を開いた直後、モジュールのどの処理よりも先に入れておくドキュメント
 *     （起動時のマイグレーションを試すときに使う）
 * @returns {{ Manager: any, instances: Array<RealDatastore> }}
 */
function loadWithInMemoryNedb(modulePath, extraStubs = {}, { seed = [] } = {}) {
    const instances = [];
    class InMemoryDatastore extends RealDatastore {
        constructor(_opts) {
            super();
            instances.push(this);
        }

        loadDatabase(...args) {
            // in-memory の loadDatabase は中身を空にするので、仕込みはその後に積む。
            // NeDB の操作は順に実行されるので、ここで積んだ insert はモジュールの初期化処理より先に終わる
            const result = super.loadDatabase(...args);
            if (seed.length > 0) this.insertAsync(seed);
            return result;
        }
    }
    const Manager = proxyquire(modulePath, Object.assign({ '@seald-io/nedb': InMemoryDatastore }, extraStubs));
    return { Manager, instances };
}

module.exports = { loadWithInMemoryNedb };

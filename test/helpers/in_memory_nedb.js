const proxyquire = require('proxyquire').noCallThru();
const RealDatastore = require('@seald-io/nedb');

/**
 * ファイルに書かずメモリ上だけで動く NeDB を差し込んで、テーブルマネージャのモジュールを読み込み直す。
 *
 * テーブルマネージャはモジュールレベルに DB インスタンスとキャッシュを持つため、
 * proxyquire で毎回読み込み直すことでテストごとに初期状態へ戻す。
 * 生成された Datastore は `instances` に残るので、テストから直接中身を覗いたり、
 * 古い形式のレコードを入れたりできる。
 *
 * @param {string} modulePath このファイルから見たモジュールのパス（test/unit_specs から見たときと同じ）
 * @param {object} [extraStubs] proxyquire に追加で渡すスタブ
 * @returns {{ Manager: any, instances: Array<RealDatastore> }}
 */
function loadWithInMemoryNedb(modulePath, extraStubs = {}) {
    const instances = [];
    class InMemoryDatastore extends RealDatastore {
        constructor(_opts) {
            super();
            instances.push(this);
        }
    }
    const Manager = proxyquire(modulePath, Object.assign({ '@seald-io/nedb': InMemoryDatastore }, extraStubs));
    return { Manager, instances };
}

module.exports = { loadWithInMemoryNedb };

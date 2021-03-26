const path = require('path');
const logger = require('log4js').getLogger(path.basename(__filename));
const assert = require('assert').strict;
const uuid = require('uuidv4').uuid;
const errors = require('../../core/errors').promises;
const ISilenceActionRepo = require('../../domain/repo/i_silence_action_repo');
const ISilenceDictionaryRepo = require('../../domain/repo/i_silence_dictionary_repo');
const SilenceDictionary = require('../../domain/entity/silence_dictionary');
const SilenceDictionaryLine = require('../../domain/entity/silence_dictionary_line');
const Datastore = require('nedb');

/** @typedef {import('../../domain/entity/actions/silence_create_action')} SilenceCreateAction */
/** @typedef {import('../../domain/entity/actions/silence_delete_action')} SilenceDeleteAction */
/** @typedef {import('../../domain/entity/actions/silence_clear_action')} SilenceClearAction */

/** @typedef {string} ServerID サーバーID */

/** @typedef {string} UserID 沈黙ユーザーID */
/** @typedef {Date} CreatedAt 追加日時 */
/** @typedef {string} RecordID レコードID */
/** @typedef {[UserID, CreatedAt, RecordID]} Record レコード*/

/**
 * Nedbのインスタンス
 *
 * @type {Nedb}
 */
let dbInstance;

/**
 * 単語辞書データのキャッシュ
 *
 * @type {Map<ServerID, Array<Record>}
 */
let cache;

/**
 * モジュールの初回呼び出しフラグ
 *
 * @type {boolean}
 */
let firstCall = true;

/**
 * モジュールの初期化（実際にこの実装がDIされるまで初期化処理を遅延させる）
 */
function init() {
    // Nedbのロード
    dbInstance = new Datastore({ filename: './db/blacklist.db', autoload: true });
    dbInstance.loadDatabase();
    dbInstance.persistence.setAutocompactionInterval(86400000);

    // キャッシュ領域の割当
    cache = new Map();

    logger.trace('モジュールが初期化された');
}

/**
 * キャッシュからデータを取得
 * キャッシュがなければDBからロード
 *
 * @param {ServerID} serverId
 * @returns {Promise<Array<Record>>}
 */
async function loadSharedData(serverId) {
    assert(typeof serverId === 'string');

    // キャッシュにデータがあればそのまま返却
    if (cache.has(serverId)) {
        return Promise.resolve(cache.get(serverId));
    }

    // キャッシュにデータがなければDBから取得
    const promise = new Promise((resolve, reject) =>
        dbInstance.findOne({ id: serverId }, (err, doc) => {
            if (err) return reject(err);

            if (doc) {
                let dict = doc.users;
                // <!-- 2020-03-29 マイグレーション処理
                // TODO いずれ消す
                if (dict.some(data => typeof data === 'string')) {
                    logger.info('マイグレーションを開始');
                    dict = dict.map(data => {
                        if (typeof data === 'string') {
                            const record = [];
                            record[0] = data;
                            record[1] = new Date();
                            record[2] = uuid();
                            logger.info(`migrate: ${data} ${record}`);
                            return record;
                        }
                        return data;
                    });
                    logger.info('マイグレーションを終了');
                }
                // -->
                resolve(dict);
            } else {
                dbInstance.insert({ id: serverId, users: [] }, err => {
                    if (err) reject(err);
                    else resolve([]);
                });
            }
        })
    );
    const records = await promise;

    // 先をこされてなければ
    if (!cache.has(serverId)) {
        // DBから取得したものをキャッシュする
        cache.set(serverId, records);
        // データを返却する
        return Promise.resolve(records);
    }

    // 先を越されたなら先人のものを返却
    // プロセスで共有されるArrayインスタンスは一つでないとまずい
    return Promise.resolve(cache.get(serverId));
}

/**
 * キャッシュ上のデータをNedbに書き込み
 *
 * @param {ServerID} serverId
 * @returns {Promise<void>}
 */
async function persistSharedData(serverId) {
    assert(typeof serverId === 'string');

    // バグがなければ起こりえないはずのオペレーション
    if (!cache.has(serverId)) {
        return errors.unexpected(`nothing to persist ${serverId}`);
    }

    // キャッシュから辞書データを取得
    const records = cache.get(serverId);

    // 辞書データのスライスを永続化
    const promise = new Promise((resolve, reject) =>
        dbInstance.update({ id: serverId }, { $set: { users: records.slice() } }, err =>
            err ? reject(err) : resolve()
        )
    );
    await promise;

    // 処理完了
    return Promise.resolve();
}

/**
 * 一行マッピング
 *
 * @param {Record} record
 * @param {ServerID} serverId
 * @returns {SilenceDictionaryLine}
 */
function createLine(record, serverId) {
    assert(typeof record === 'object' && Array.isArray(record));
    assert(typeof serverId === 'string');

    return new SilenceDictionaryLine({
        id: record[2],
        dictId: serverId,
        userId: record[0],
        createdAt: record[1],
    });
}

/**
 * 全行マッピング
 *
 * @param {Array<Record>} records
 * @param {ServerID} serverId
 * @returns {SilenceDictionary}
 */
function createDict(records, serverId) {
    assert(typeof records === 'object' && Array.isArray(records));
    assert(typeof serverId === 'string');

    const lines = records.map(record => createLine(record, serverId));
    return new SilenceDictionary({
        id: serverId,
        serverId,
        lines,
    });
}

/**
 * Nedb沈黙ユーザー辞書テーブルマネージャ
 *
 * @implements {ISilenceDictionaryRepo}
 * @implements {ISilenceActionRepo}
 */
class NedbSilenceDictionaryTableManager {
    /**
     * DIコンテナ用コンストラクタ
     * 初回呼び出し時にはモジュール初期化を行う
     */
    constructor() {
        if (firstCall) {
            firstCall = false;
            init();
        }
    }

    /**
     * (impl) ISilenceDictionaryRepo
     *
     * @param {string} serverId
     * @returns {Promise<SilenceDictionary>}
     */
    async loadSilenceDictionary(serverId) {
        assert(typeof serverId === 'string');

        const records = await loadSharedData(serverId);
        const silenceDict = createDict(records.slice(), serverId);
        return Promise.resolve(silenceDict);
    }

    /**
     * (impl) ISilenceActionRepo
     *
     * @param {SilenceCreateAction} action
     * @returns {Promise<void>}
     */
    async postSilenceCreate(action) {
        assert(typeof action === 'object');

        const records = await loadSharedData(action.serverId);

        if (records.some(record => action.userId === record[0])) {
            return errors.disappointed(`silence-already-exists ${action} ${records}`);
        }

        records.push([action.userId, new Date(), uuid()]);

        await persistSharedData(action.serverId);
    }

    /**
     * (impl) ISilenceActionRepo
     *
     * @param {SilenceDeleteAction} action
     * @returns {Promise<void>}
     */
    async postSilenceDelete(action) {
        assert(typeof action === 'object');

        const records = await loadSharedData(action.serverId);
        const index = records.findIndex(record => action.silenceId === record[2]);

        if (index === -1) {
            return errors.disappointed(`silence-not-found ${action} ${records}`);
        }

        records.splice(index, 1);

        await persistSharedData(action.serverId);
    }

    /**
     * (impl) ISilenceActionRepo
     *
     * @param {SilenceClearAction} action
     * @returns {Promise<void>}
     */
    async postSilenceClear(action) {
        assert(typeof action === 'object');

        const records = await loadSharedData(action.serverId);

        if (records.length === 0) {
            return errors.disappointed(`silence-dict-is-empty-already ${action}`);
        }

        records.splice(0, records.length);

        await persistSharedData(action.serverId);
    }
}

// ISilenceActionRepoの実装として登録
ISilenceActionRepo.comprise(NedbSilenceDictionaryTableManager);

// ISilenceDictionaryRepoの実装として登録
ISilenceDictionaryRepo.comprise(NedbSilenceDictionaryTableManager);

module.exports = NedbSilenceDictionaryTableManager;

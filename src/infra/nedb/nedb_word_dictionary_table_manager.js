const path = require('path');
const logger = require('log4js').getLogger(path.basename(__filename));
const assert = require('assert').strict;
const uuid = require('uuidv4').uuid;
const errors = require('../../core/errors').promises;
const IWordActionRepo = require('../../domain/repos/i_word_action_repo');
const IWordDictionaryRepo = require('../../domain/repos/i_word_dictionary_repo');
const Datastore = require('nedb');
const WordDictionary = require('../../domain/entities/word_dictionary');
const WordDictionaryLine = require('../../domain/entities/word_dictionary_line');

/** @typedef {import('../../domain/entities/actions/word_create_action')} WordCreateAction */
/** @typedef {import('../../domain/entities/actions/word_delete_action')} WordDeleteAction */
/** @typedef {import('../../domain/entities/actions/word_clear_action')} WordClearAction */

/** @typedef {string} ServerID サーバーID */
/** @typedef {string} From 置換前単語 */
/** @typedef {string} To 置換後単語 */
/** @typedef {string} RecordID レコードID */
/** @typedef {[From, To, RecordID]} Record レコード*/

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
    dbInstance = new Datastore({ filename: './db/teach.db', autoload: true });
    dbInstance.loadDatabase();
    dbInstance.persistence.setAutocompactionInterval(86400000);

    // キャッシュ領域の割当
    cache = new Map();
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
                let dict = doc.dict;
                // <!-- 2020-03-23 マイグレーション処理
                // TODO いずれ消す
                if (dict.some(data => typeof data[2] === 'undefined')) {
                    logger.info('マイグレーションを開始');
                    dict = dict.map(data => {
                        if (typeof data[2] === 'undefined') {
                            data[2] = uuid();
                            logger.info(`migrate: ${data}`);
                        }
                        return data;
                    });
                    logger.info('マイグレーションを終了');
                }
                // -->
                resolve(dict);
            } else {
                dbInstance.insert({ id: serverId, dict: [] }, err => {
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
 * @param {string} serverId
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
        dbInstance.update({ id: serverId }, { $set: { dict: records.slice() } }, err => (err ? reject(err) : resolve()))
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
 * @returns {WordDictionaryLine}
 */
function createLine(record, serverId) {
    assert(typeof record === 'object' && Array.isArray(record));
    assert(typeof serverId === 'string');

    return new WordDictionaryLine({
        id: record[2],
        dictId: serverId,
        from: record[0],
        to: record[1],
    });
}

/**
 * 全行マッピング
 *
 * @param {Array<Record>} records
 * @param {ServerID} serverId
 * @returns {WordDictionary}
 */
function createDict(records, serverId) {
    assert(typeof records === 'object' && Array.isArray(records));
    assert(typeof serverId === 'string');

    const lines = records.map(record => createLine(record, serverId));
    return new WordDictionary({
        id: serverId,
        serverId,
        lines,
    });
}

/**
 * Nedb単語辞書テーブルマネージャ
 *
 * @implements {IWordDictionaryRepo}
 * @implements {IWordActionRepo}
 */
class NedbWordDictionaryTableManager {
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
     * (impl) IWordDictionaryRepo
     *
     * @param {string} serverId
     * @returns {Promise<WordDictionary>}
     */
    async loadWordDictionary(serverId) {
        assert(typeof serverId === 'string');

        const records = await loadSharedData(serverId);
        const wordDict = createDict(records.slice(), serverId);
        return Promise.resolve(wordDict);
    }

    /**
     * (impl) IWordActionRepo
     *
     * @param {WordCreateAction} action
     * @returns {Promise<void>}
     */
    async postWordCreate(action) {
        assert(typeof action === 'object');

        const records = await loadSharedData(action.serverId);

        if (records.some(record => action.from === record[0])) {
            return errors.disappointed(`word-already-exists ${action} ${records}`);
        }

        records.push([action.from, action.to, uuid()]);

        await persistSharedData(action.serverId);
    }

    /**
     * (impl) IWordActionRepo
     *
     * @param {WordDeleteAction} action
     * @returns {Promise<void>}
     */
    async postWordDelete(action) {
        assert(typeof action === 'object');

        const records = await loadSharedData(action.serverId);
        const index = records.findIndex(record => action.wordId === record[2]);

        if (index === -1) {
            return errors.disappointed(`word-not-found ${action} ${records}`);
        }

        records.splice(index, 1);

        await persistSharedData(action.serverId);
    }

    /**
     * (impl) IWordActionRepo
     *
     * @param {WordClearAction} action
     * @returns {Promise<void>}
     */
    async postWordClear(action) {
        assert(typeof action === 'object');

        const records = await loadSharedData(action.serverId);

        if (records.length === 0) {
            return errors.disappointed(`worddict-is-empty-already ${action}`);
        }

        records.splice(0, records.length);

        await persistSharedData(action.serverId);
    }
}

// IWordActionRepoの実装として登録
IWordActionRepo.comprise(NedbWordDictionaryTableManager);

// IWordDictionaryRepoの実装として登録
IWordDictionaryRepo.comprise(NedbWordDictionaryTableManager);

module.exports = NedbWordDictionaryTableManager;

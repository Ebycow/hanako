const path = require('path');
const logger = require('log4js').getLogger(path.basename(__filename));
const assert = require('assert').strict;
const uuid = require('uuidv4').uuid;
const prettyBytes = require('pretty-bytes');
const axios = require('axios').default;
const prism = require('prism-media');
const FileType = require('file-type');
const Readable = require('stream').Readable;
const errors = require('../../core/errors').promises;
const AppSettings = require('../../core/app_settings');
const IFoleyActionRepo = require('../../domain/repo/i_foley_action_repo');
const IFoleyDictionaryRepo = require('../../domain/repo/i_foley_dictionary_repo');
const IFoleyStreamRepo = require('../../domain/repo/i_foley_stream_repo');
const IObjectStorageRepo = require('../../domain/repo/i_object_storage_repo');
const Datastore = require('nedb');
const FoleyDictionary = require('../../domain/entity/foley_dictionary');
const FoleyDictionaryLine = require('../../domain/entity/foley_dictionary_line');

/** @typedef {import('../../domain/entity/audios/foley_audio')} FoleyAudio */
/** @typedef {import('../../domain/entity/actions/foley_create_action')} FoleyCreateAction */
/** @typedef {import('../../domain/entity/actions/foley_delete_action')} FoleyDeleteAction */
/** @typedef {import('../../domain/entity/actions/foley_clear_action')} FoleyClearAction */

/** @typedef {string} ServerID サーバーID */
/** @typedef {string} Keyword キーワード */
/** @typedef {string} Url 元音源のURL */
/** @typedef {string} RecordID レコードID */
/** @typedef {[Keyword, Url, RecordID]} Record レコード*/

/**
 * Nedbのインスタンス
 *
 * @type {Nedb}
 */
let dbInstance;

/**
 * DBデータのキャッシュ
 *
 * @type {Map<ServerID, Array<Record>>}
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
    dbInstance = new Datastore({ filename: './db/soundeffect.db', autoload: true });
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
                let dict = doc.dict;
                // <!-- 2020-04-01 マイグレーション処理
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

    // SE辞書データのスライスを永続化
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
 * @returns {FoleyDictionaryLine}
 */
function createLine(record, serverId) {
    assert(typeof record === 'object' && Array.isArray(record));
    assert(typeof serverId === 'string');

    return new FoleyDictionaryLine({
        id: record[2],
        dictId: serverId,
        keyword: record[0],
        url: record[1],
    });
}

/**
 * 全行マッピング
 *
 * @param {Array<Record>} records
 * @param {ServerID} serverId
 * @returns {FoleyDictionary}
 */
function createDict(records, serverId) {
    assert(typeof records === 'object' && Array.isArray(records));
    assert(typeof serverId === 'string');

    const lines = records.map(record => createLine(record, serverId));
    return new FoleyDictionary({
        id: serverId,
        serverId,
        lines,
    });
}

/**
 * NedbSE辞書テーブルマネージャ
 *
 * @implements {IFoleyDictionaryRepo}
 * @implements {IFoleyActionRepo}
 * @implements {IFoleyStreamRepo}
 */
class NedbFoleyDictionaryTableManager {
    /**
     * DIコンテナ用コンストラクタ
     * 初回呼び出し時にはモジュール初期化を行う
     *
     * @param {AppSettings} appSettings DI
     * @param {IObjectStorageRepo} objectStorageRepo DI
     */
    constructor(appSettings, objectStorageRepo) {
        if (firstCall) {
            firstCall = false;
            init();
        }
        this.appSettings = appSettings;
        this.objectStorageRepo = objectStorageRepo;
        this.ffmpegOptions = ['-analyzeduration', '0', '-loglevel', '0', '-f', 's16le', '-ar', '48000', '-ac', '2'];

        // FFmpeg 出力ファイルサイズ制限を適用する
        // See: https://www.ffmpeg.org/ffmpeg.html#Main-options
        // Note: size(bytes) = seconds * frames/sec(48kHz) * bytes/frame(16-bit) * channels(Stereo)
        const maxOutputSize = (appSettings.foleyMaxAudioSeconds * 48000 * 2 * 2) >>> 0;
        this.ffmpegOptions.push('-fs', `${maxOutputSize}`);
    }

    /**
     * (impl) IFoleyDictionaryRepo
     *
     * @param {string} serverId
     * @returns {Promise<FoleyDictionary>}
     */
    async loadFoleyDictionary(serverId) {
        assert(typeof serverId === 'string');

        const records = await loadSharedData(serverId);
        const foleyDict = createDict(records.slice(), serverId);
        return Promise.resolve(foleyDict);
    }

    /**
     * (impl) IFoleyActionRepo
     *
     * @param {FoleyCreateAction} action
     * @returns {Promise<void>}
     */
    async postFoleyCreate(action) {
        assert(typeof action === 'object');

        // Note: IFoleyActionRepoの各種EbyErrorのmessageは返信メッセージ内容に反映される
        //       以下errorsを返す時はかならずmessageを添える

        const records = await loadSharedData(action.serverId);

        if (records.some(record => action.keyword === record[0])) {
            const message = 'すでに登録されてるみたい... :sob:';
            return errors.disappointed(`keyword-already-exists ${action} ${records}`, message);
        }

        let response;
        try {
            response = await axios.get(action.url, {
                responseType: 'arraybuffer',
                maxContentLength: this.appSettings.foleyMaxDownloadByteSize,
            });
        } catch (err) {
            // AXIOS null やめて
            // cf. https://github.com/axios/axios/blob/v0.19.1/lib/adapters/http.js#L219-L220
            if (err.message.startsWith('maxContentLength size of ')) {
                const maxSize = prettyBytes(this.appSettings.foleyMaxDownloadByteSize).replace(/\s/, '');
                const message = `${maxSize}以上のデータは大きすぎて入らないにゃ :sob:`;
                return errors.unexpected('foley-http-data-too-large', message);
            } else if (err.response && err.response.status >= 400) {
                const message = 'URLのファイルが見つからないにゃ :sob:';
                return errors.unexpected('foley-http-file-not-found', message);
            } else {
                return Promise.reject(err);
            }
        }

        const fileType = await FileType.fromBuffer(response.data);
        if (!fileType || !fileType.mime.startsWith('audio')) {
            const message = 'これサウンドファイルじゃなさそう :sob:';
            return errors.unexpected('foley-http-invalid-mine-type', message);
        }

        try {
            const args = this.ffmpegOptions.slice();
            const ffmpeg = new prism.FFmpeg({ args });
            const stream = Readable.from(response.data, { objectMode: false }).pipe(ffmpeg);
            const objectKey = Buffer.from(action.keyword).toString('base64');
            // Note: 辞書登録を遅延できるのはsaveFileが同じKeyのレコード挿入を受け付けないため
            //       先着一名様以外はここで不整合エラーになる
            await this.objectStorageRepo.saveFile(action.serverId, objectKey, 'pcm', stream);
        } catch (err) {
            return Promise.reject(err);
        }

        records.push([action.keyword, action.url, uuid()]);
        await persistSharedData(action.serverId);
    }

    /**
     * (impl) IFoleyActionRepo
     *
     * @param {FoleyDeleteAction} action
     * @returns {Promise<void>}
     */
    async postFoleyDelete(action) {
        assert(typeof action === 'object');

        // Note: IFoleyActionRepoの各種EbyErrorのmessageは返信メッセージ内容に反映される
        //       以下errorsを返す時はかならずmessageを添える

        const records = await loadSharedData(action.serverId);
        const index = records.findIndex(record => action.foleyId === record[2]);

        if (index === -1) {
            const message = 'すでに削除されてるみたい... :sob:';
            return errors.disappointed(`foley-not-found ${action} ${records}`, message);
        }

        const objectKey = Buffer.from(records[index][0]).toString('base64');

        // Note: 削除オペレーションは先に辞書を保存しても致命的な結果不整合にならない
        //       逆にArray.prototype.splice(index)はnextTickでindexが同じ場所を指す保証がない
        records.splice(index, 1);
        await persistSharedData(action.serverId);

        // Note: 最も不運なケースはここで停電かカーネルパニックのときレコードが削除されない
        //       その時生じる結果不整合は「この単語で再登録できない」なのでコストトレードオフで受け入れる
        // TODO FUTURE 管理画面があれば運用でカバーできる
        await this.objectStorageRepo.deleteFile(action.serverId, objectKey, 'pcm');
    }

    /**
     * (impl) IFoleyStreamRepo
     *
     * @param {FoleyAudio} audio
     * @returns {Promise<Readable>}
     */
    async getFoleyStream(audio) {
        assert(typeof audio === 'object');

        const records = await loadSharedData(audio.serverId);
        const record = records.find(record => audio.foleyId === record[2]);

        if (!record) {
            return errors.disappointed(`foley-not-found ${audio} ${records}`);
        }

        const objectKey = Buffer.from(record[0]).toString('base64');
        const stream = await this.objectStorageRepo.readFile(audio.serverId, objectKey, 'pcm');
        return Promise.resolve(stream);
    }
}

// IFoleyActionRepoの実装として登録
IFoleyActionRepo.comprise(NedbFoleyDictionaryTableManager, [AppSettings, IObjectStorageRepo]);

// IFoleyDictionaryRepoの実装として登録
IFoleyDictionaryRepo.comprise(NedbFoleyDictionaryTableManager, [AppSettings, IObjectStorageRepo]);

// IFoleyStreamRepoの実装として登録
IFoleyStreamRepo.comprise(NedbFoleyDictionaryTableManager, [AppSettings, IObjectStorageRepo]);

module.exports = NedbFoleyDictionaryTableManager;

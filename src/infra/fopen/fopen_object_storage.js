const path = require('path');
const logger = require('log4js').getLogger(path.basename(__filename));
const fs = require('fs');
const uuid = require('uuidv4').uuid;
const errors = require('../../core/errors').types;
const Datastore = require('@seald-io/nedb');
const IObjectStorageRepo = require('../../domain/repo/i_object_storage_repo');

/** @typedef {import('stream').Readable} Readable */

/**
 * @typedef Record
 * @type {object}
 * @property {string} segment セグメントキー
 * @property {string} descriptive オブジェクトキー
 * @property {string} suffix ファイルタイプ
 * @property {?string} file 実ファイル名
 */

/**
 * Nedbのインスタンス
 *
 * @type {Nedb}
 */
let dbInstance;

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
    dbInstance = new Datastore({ filename: './db/files.db', autoload: true });
    dbInstance.loadDatabase();
    dbInstance.setAutocompactionInterval(86400000);

    // 既存レコードに _key フィールドを付与してからユニーク制約を作成
    migrateAndEnsureIndex().catch((err) => logger.error('_keyマイグレーションエラー:', err));

    logger.trace('モジュールが初期化された');
}

/**
 * 既存レコードに _key フィールドがなければ付与し、ユニークインデックスを作成する
 */
async function migrateAndEnsureIndex() {
    const docs = await dbInstance.findAsync({ _key: { $exists: false } });
    for (const doc of docs) {
        const key = `${doc.segment}:${doc.descriptive}:${doc.suffix}`;
        await dbInstance.updateAsync({ _id: doc._id }, { $set: { _key: key } });
    }
    await dbInstance.ensureIndexAsync({ fieldName: '_key', unique: true });
    if (docs.length > 0) {
        logger.trace(`_keyマイグレーション完了: ${docs.length}件`);
    }
}

/**
 * 新規DBレコードを生成
 *
 * @param {string} segmentKey セグメントキー
 * @param {string} objectKey オブジェクトキー
 * @param {string} fileType ファイル種別
 * @param {string} fileName 実ファイル名
 * @returns {Record}
 */
function newRecord(segmentKey, objectKey, fileType, fileName) {
    return {
        _key: `${segmentKey}:${objectKey}:${fileType}`,
        segment: segmentKey,
        descriptive: objectKey,
        suffix: fileType,
        file: fileName,
    };
}

/**
 * 新規DBクエリを生成
 *
 * @param {string} segmentKey セグメントキー
 * @param {string} objectKey オブジェクトキー
 * @param {string} fileType ファイル種別
 * @returns {Record}
 */
function newQuery(segmentKey, objectKey, fileType) {
    return {
        segment: segmentKey,
        descriptive: objectKey,
        suffix: fileType,
    };
}

/**
 * FileIOとNedbによるセグメント(Discordサーバー)ごとの疑似オブジェクトストレージ実装
 *
 * @implements {IObjectStorageRepo}
 */
class FopenObjectStorage {
    /**
     * DIコンテナ用コンストラクタ
     * 初回呼び出し時にはモジュール初期化を行う
     */
    constructor() {
        if (firstCall) {
            firstCall = false;
            init();
        }
        this.db = dbInstance;
    }

    /**
     * (impl) IObjectStorageRepo
     *
     * @param {string} segmentKey
     * @param {string} objectKey
     * @param {string} fileType
     * @param {Readable} dataStream
     * @returns {Promise<void>}
     */
    async saveFile(segmentKey, objectKey, fileType, dataStream) {
        const fileName = uuid();
        const dirPath = `./files/${segmentKey}/${fileType}`;
        const filePath = `./files/${segmentKey}/${fileType}/${fileName}.${fileType}`;

        // 1. ディレクトリ作成
        await fs.promises.mkdir(dirPath, { recursive: true });

        // 2. ファイル書き込み（UUID名なので衝突しない）
        await new Promise((resolve, reject) => {
            const writable = fs.createWriteStream(filePath);
            dataStream.pipe(writable);
            writable.on('finish', () => resolve());
            writable.on('error', (err) => reject(err));
        });

        // 3. DBレコード挿入（_key ユニーク制約で重複を原子的に排除）
        //    失敗時は孤児ファイルを削除してからエラーを伝搬
        const record = newRecord(segmentKey, objectKey, fileType, fileName);
        try {
            await new Promise((resolve, reject) => {
                this.db.insert(record, (err) => {
                    if (err) {
                        reject(err);
                    } else {
                        resolve();
                    }
                });
            });
        } catch (err) {
            await fs.promises.unlink(filePath).catch((unlinkErr) => {
                logger.warn('孤児ファイル削除失敗:', unlinkErr);
            });
            if (err.errorType === 'uniqueViolated') {
                throw new errors.Disappointed('key-already-exists', 'すでにキーが存在しています。');
            }
            throw err;
        }
    }

    /**
     * (impl) IObjectStorageRepo
     *
     * @param {string} segmentKey
     * @param {string} objectKey
     * @param {string} fileType
     * @returns {Promise<Readable>}
     */
    async readFile(segmentKey, objectKey, fileType) {
        return new Promise((resolve, reject) => {
            const query = newQuery(segmentKey, objectKey, fileType);
            this.db.find(query, (err, docs) => {
                if (err) {
                    reject(err);
                } else if (docs.length === 0) {
                    logger.warn('整合性警告：存在しないキー', query);
                    reject(new errors.Disappointed('record-not-found', '対応するデータが存在しません。'));
                } else {
                    if (docs.length > 1) {
                        logger.warn('整合性警告：複数レコード検知');
                        logger.warn(`count:${docs.length} seg:${segmentKey} desc:${objectKey} suf:${fileType}`);
                    }
                    resolve(docs[0].file);
                }
            });
        }).then(
            (fileName) =>
                new Promise((resolve, reject) => {
                    const filePath = `./files/${segmentKey}/${fileType}/${fileName}.${fileType}`;
                    const readable = fs.createReadStream(filePath);
                    readable.on('ready', () => resolve(readable));
                    readable.on('error', (err) => {
                        if (err.code === 'ENOENT') {
                            logger.warn('整合性警告：レコード有り対象ファイル無し');
                            logger.warn('error:', err);
                            reject(new errors.Disappointed('file-not-found', 'ファイルが存在しません。'));
                        } else {
                            reject(err);
                        }
                    });
                })
        );
    }

    /**
     * (impl) IObjectStorageRepo
     *
     * @param {string} segmentKey
     * @param {string} objectKey
     * @param {string} fileType
     * @returns {Promise<void>}
     */
    async deleteFile(segmentKey, objectKey, fileType) {
        const query = newQuery(segmentKey, objectKey, fileType);

        return new Promise((resolve, reject) => {
            this.db.find(query, (err, docs) => {
                if (err) {
                    reject(err);
                } else if (docs.length === 0) {
                    logger.warn('整合性警告：存在しないキー', query);
                    reject(new errors.Disappointed('record-not-found', '対応するデータが存在しません。'));
                } else {
                    if (docs.length > 1) {
                        logger.warn('整合性警告：複数レコード検知');
                        logger.warn(`count:${docs.length} seg:${segmentKey} desc:${objectKey} suf:${fileType}`);
                        logger.warn('Delete要求なのでこのまま全て削除します。');
                    }
                    resolve(docs);
                }
            });
        })
            .then((docs) => {
                const remove = async (doc) => {
                    const fileName = doc.file;
                    const filePath = `./files/${segmentKey}/${fileType}/${fileName}.${fileType}`;
                    return new Promise((resolve, reject) =>
                        fs.unlink(filePath, (err) => {
                            if (err) {
                                if (err.code === 'ENOENT') {
                                    logger.warn('整合性警告：レコード有り対象ファイル無し');
                                    logger.warn('error:', err);
                                    logger.warn('Delete要求なのでこのまま続行します。');
                                    resolve();
                                } else {
                                    reject(err);
                                }
                            } else {
                                resolve();
                            }
                        })
                    );
                };
                return docs.reduce((promise, doc) => promise.then(() => remove(doc)), Promise.resolve());
            })
            .then(
                () =>
                    new Promise((resolve, reject) => {
                        this.db.remove(query, (err, numRemoved) => {
                            if (err) {
                                reject(err);
                            } else if (numRemoved === 0) {
                                logger.warn('整合性警告：レコード削除数０');
                                resolve();
                            } else {
                                resolve();
                            }
                        });
                    })
            );
    }
}

// IObjectStorageRepoの実装として登録
IObjectStorageRepo.comprise(FopenObjectStorage);

module.exports = FopenObjectStorage;

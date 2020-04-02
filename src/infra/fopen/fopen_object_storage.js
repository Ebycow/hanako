const path = require('path');
const logger = require('log4js').getLogger(path.basename(__filename));
const fs = require('fs');
const uuid = require('uuidv4').uuid;
const errors = require('../../core/errors').types;
const Datastore = require('nedb');
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
    dbInstance.persistence.setAutocompactionInterval(86400000);

    logger.trace('モジュールが初期化された');
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

        return new Promise((resolve, reject) => {
            fs.mkdir(dirPath, { recursive: true }, err => {
                if (err) {
                    reject(err);
                } else {
                    resolve();
                }
            });
        })
            .then(
                () =>
                    new Promise((resolve, reject) => {
                        const query = newQuery(segmentKey, objectKey, fileType);
                        this.db.find(query, (err, docs) => {
                            if (err) {
                                reject(err);
                            } else if (docs.length > 0) {
                                logger.warn(`整合性警告：すでに存在するキー`, query, docs);
                                reject(new errors.Disappointed(`key-already-exists`, 'すでにキーが存在しています。'));
                            } else {
                                resolve();
                            }
                        });
                    })
            )
            .then(
                () =>
                    new Promise((resolve, reject) => {
                        const writable = fs.createWriteStream(filePath);
                        dataStream.pipe(writable);
                        writable.on('finish', () => resolve());
                        writable.on('error', err => reject(err));
                    })
            )
            .then(
                () =>
                    new Promise((resolve, reject) => {
                        const record = newRecord(segmentKey, objectKey, fileType, fileName);
                        this.db.insert(record, err => {
                            if (err) {
                                reject(err);
                            } else {
                                resolve();
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
            fileName =>
                new Promise((resolve, reject) => {
                    const filePath = `./files/${segmentKey}/${fileType}/${fileName}.${fileType}`;
                    const readable = fs.createReadStream(filePath);
                    readable.on('ready', () => resolve(readable));
                    readable.on('error', err => {
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
            .then(docs => {
                const remove = async doc => {
                    const fileName = doc.file;
                    const filePath = `./files/${segmentKey}/${fileType}/${fileName}.${fileType}`;
                    return new Promise((resolve, reject) =>
                        fs.unlink(filePath, err => {
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

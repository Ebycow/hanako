const fs = require('fs');
const { Readable } = require('stream');
const DataStore = require('nedb');
const { uuid } = require('uuidv4');
const axios = require('axios').default;
const prism = require('prism-media');

const FileAdapterErrors = {
    ALREADY_EXISTS: 'fae already exists',
    NOT_FOUND: 'fae not found',
};

/**
 * セグメント(Discordサーバー)ごとのファイル読み書き用アダプタ
 */
class FileAdapter {
    
    constructor() {
        /**
         * @type {Nedb}
         */
        this.db = new DataStore({ filename: './db/files.db', autoload: true });
        this.db.persistence.setAutocompactionInterval(86400000);
    }

    /**
     * @param {string} segmentKey 
     * @param {string} descriptiveKey
     * @param {string} suffix 
     * @param {Readable} dataStream 
     * @throws {FileAdapterErrors.ALREADY_EXISTS}
     * @returns {Promise<void>} 
     */
    saveFile(segmentKey, descriptiveKey, suffix, dataStream) {
        const fileName = uuid();
        const dirPath = `./files/${segmentKey}/${suffix}`;
        const filePath = `./files/${segmentKey}/${suffix}/${fileName}.${suffix}`;
 
        return new Promise((resolve, reject) => {
                fs.mkdir(dirPath, { recursive: true }, (err) => {
                    if (err) {
                        reject(err);
                    } else {
                        resolve();
                    }
                });
            }).then(() => new Promise((resolve, reject) => {
                const query = {
                    segment: segmentKey,
                    descriptive: descriptiveKey,
                    suffix: suffix
                };
                this.db.find(query, (err, docs) => {
                    if (err) {
                        reject(err);
                    } else if (docs.length > 0) {
                        reject(FileAdapterErrors.ALREADY_EXISTS);
                    } else {
                        resolve();
                    }
                });
            }).then(() => new Promise((resolve, reject) => {
                const writable = fs.createWriteStream(filePath);
                dataStream.pipe(writable);
                writable.on('finish', () => resolve());
                writable.on('error', (err) => reject(err));
            }).then(() => new Promise((resolve, reject) => {
                const newRecord = {
                    segment: segmentKey,
                    descriptive: descriptiveKey,
                    suffix: suffix,
                    file: fileName
                };
                this.db.insert(newRecord, (err, _) => {
                    if (err) {
                        reject(err)
                    } else {
                        resolve();
                    }
                });
            }))));
    }

    /**
     * @param {string} segmentKey 
     * @param {string} descriptiveKey 
     * @param {string} suffix 
     * @throws {FileAdapterErrors.NOT_FOUND}
     * @returns {Promise<Readable>}
     */
    readFile(segmentKey, descriptiveKey, suffix) {
        return new Promise((resolve, reject) => {
            const query = {
                segment: segmentKey,
                descriptive: descriptiveKey,
                suffix: suffix
            };
            this.db.find(query, (err, docs) => {
                if (err) {
                    reject(err);
                } else if (docs.length === 0) {
                    reject(FileAdapterErrors.NOT_FOUND);
                } else {
                    if (docs.length > 1) {
                        console.warn('整合性警告：複数レコード検知');
                        console.warn(`count:${docs.length} seg:${segmentKey} desc:${descriptiveKey} suf:${suffix}`);
                    }
                    resolve(docs[0].file);
                }
            });
        }).then((fileName) => new Promise((resolve, reject) => {
            const filePath = `./files/${segmentKey}/${suffix}/${fileName}.${suffix}`;
            const readable = fs.createReadStream(filePath);
            readable.on('ready', _ => resolve(readable));
            readable.on('error', err => {
                if (err.code === 'ENOENT') {
                    console.warn('整合性警告：レコード有り対象ファイル無し');
                    console.warn('error:', err);
                    reject(FileAdapterErrors.NOT_FOUND);
                } else {
                    reject(err);
                }
            });
        }));
    }

    /**
     * @param {string} segmentKey 
     * @param {string} descriptiveKey 
     * @param {string} suffix 
     * @throws {FileAdapterErrors.NOT_FOUND}
     * @returns {Promise<Readable>}
     */
    deleteFile(segmentKey, descriptiveKey, suffix) {
        const query = {
            segment: segmentKey,
            descriptive: descriptiveKey,
            suffix: suffix
        };

        return new Promise((resolve, reject) => {
            this.db.find(query, (err, docs) => {
                if (err) {
                    reject(err);
                } else if (docs.length === 0) {
                    reject(FileAdapterErrors.NOT_FOUND);
                } else {
                    if (docs.length > 1) {
                        console.warn('整合性警告：複数レコード検知');
                        console.warn(`count:${docs.length} seg:${segmentKey} desc:${descriptiveKey} suf:${suffix}`);
                        console.warn('Delete要求なのでこのまま全て削除します。');
                    }
                    resolve(docs);
                }
            });
        }).then((docs) => {
            const remove = async (doc) => {
                const fileName = doc.file;
                const filePath = `./files/${segmentKey}/${suffix}/${fileName}.${suffix}`;
                return new Promise((resolve, reject) => fs.unlink(filePath, err => {
                    if (err) {
                        if (err.code === 'ENOENT') {
                            console.warn('整合性警告：レコード有り対象ファイル無し');
                            console.warn('error:', err);
                            console.warn('Delete要求なのでこのまま続行します。');
                            resolve();
                        } else {
                            reject(err);
                        }
                    } else {
                        resolve();
                    }
                }));
            };
            return docs.reduce((promise, doc) => promise.then(_ => remove(doc)), Promise.resolve());
        }).then(_ => new Promise((resolve, reject) => {
            this.db.remove(query, (err, numRemoved) => {
                if (err) {
                    reject(err);
                } else if (numRemoved === 0) {
                    console.warn('整合性警告：レコード削除数０');
                    resolve();
                } else {
                    resolve();
                }
            });
        }));
    }

}

const FFMPEG_ARGUMENTS = [
    '-analyzeduration', '0',
    '-loglevel', '0',
    '-f', 's16le',
    '-ar', '48000',
    '-ac', '2',
];

/**
 * ファイル読み書きマネージャ
 */
class FileAdapterManager {

    /**
     * @type {FileAdapter}
     * @private
     */
    static adapter;

    /**
     * 初期化処理
     */
    static init() {
        this.adapter = new FileAdapter();
    }

    /**
     * 音声ファイル保存
     * @param {string} segmentKey 
     * @param {string} descriptiveKey 
     * @param {string} url 
     * @returns {Promise<void>}
     * @throws {FileAdapterErrors.ALREADY_EXISTS}
     */
    static async saveSoundFile(segmentKey, descriptiveKey, url) {
        // TODO やっぱaxiosの404君の料理を・・・最高やな！
        const response = await axios.get(url, { responseType: 'stream' });
        const args = FFMPEG_ARGUMENTS.slice();
        const ffmpeg = new prism.FFmpeg({ args });
        const stream = response.data.pipe(ffmpeg);
        await this.adapter.saveFile(segmentKey, descriptiveKey, 'pcm', stream);
    }

    /**
     * 音声ファイルから音声ストリームを取得
     * @param {string} segmentKey 
     * @param {string} descriptiveKey 
     * @returns {Promise<Readable>}
     * @throws {FileAdapterErrors.NOT_FOUND}
     */
    static async readSoundFile(segmentKey, descriptiveKey) {
        const stream = await this.adapter.readFile(segmentKey, descriptiveKey, 'pcm');
        return stream;
    }

    /**
     * 音声ファイル削除
     * @param {string} segmentKey 
     * @param {string} descriptiveKey
     * @returns {Promise<void>}
     * @throws {FileAdapterErrors.NOT_FOUND}
     */
    static async deleteSoundFile(segmentKey, descriptiveKey) {
        await this.adapter.deleteFile(segmentKey, descriptiveKey, 'pcm');
    }

}

module.exports = {
    FileAdapterManager, FileAdapterErrors
};

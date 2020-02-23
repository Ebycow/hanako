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

}

const FFMPEG_ARGUMENTS = [
    '-analyzeduration', '0',
    '-loglevel', '0',
    '-f', 's16le',
    '-ar', '48000',
    '-ac', '2',
];

class FileAdapterManager {

    static adapter;

    static init() {
        this.adapter = new FileAdapter();
    }

    static async saveSoundFile(segmentKey, descriptiveKey, url) {
        const response = await axios.get(url, { responseType: 'stream' });
        const args = FFMPEG_ARGUMENTS.slice();
        const ffmpeg = new prism.FFmpeg({ args });
        const stream = response.data.pipe(ffmpeg);
        await this.adapter.saveFile(segmentKey, descriptiveKey, 'pcm', stream);
    }

    static async readSoundFile(segmentKey, descriptiveKey) {
        const stream = await this.adapter.readFile(segmentKey, descriptiveKey, 'pcm');
        return stream;
    }

}

module.exports = {
    FileAdapterManager, FileAdapterErrors
};

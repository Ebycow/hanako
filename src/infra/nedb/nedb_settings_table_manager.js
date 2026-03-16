const path = require('path');
const logger = require('log4js').getLogger(path.basename(__filename));
const assert = require('assert').strict;
const uuid = require('uuidv4').uuid;
const errors = require('../../core/errors').promises;
const Injector = require('../../core/injector');
const AppSettings = require('../../core/app_settings');
const ISettingsRepo = require('../../domain/repo/i_settings_repo');
const ISettingsActionRepo = require('../../domain/repo/i_settings_action_repo');
const Settings = require('../../domain/entity/settings');
const Datastore = require('@seald-io/nedb');

/** @typedef {import('../../domain/entity/actions/max_count_update_action')} MaxCountUpdateAction */
/** @typedef {import('../../domain/entity/actions/speaker_update_action')} SpeakerUpdateAction */
/** @typedef {import('../../domain/entity/actions/se_normalize_update_action')} SeNormalizeUpdateAction */

/** @typedef {string} ServerID サーバーID */

/**
 * @typedef Record
 * @type {object}
 * @property {string} id エンティティID
 * @property {string} serverId DiscordサーバーID
 * @property {number} maxCount 最大読み上げ文字数
 * @property {{ userId : string , name : string }} speaker 読み上げキャラクター
 */

/**
 * Nedbのインスタンス
 *
 * @type {Nedb}
 */
let dbInstance;

/**
 * 読み上げ花子設定データのキャッシュ
 *
 * @type {Map<ServerID, Record>}
 */
let cache;

/**
 * AppSettingsインスタンス（デフォルト値計算用）
 *
 * @type {AppSettings}
 */
let appSettings;

/**
 * モジュールの初回呼び出しフラグ
 *
 * @type {boolean}
 */
let firstCall = true;

/**
 * モジュールの初期化（実際にこの実装がDIされるまで初期化処理を遅延させる）
 *
 * @param {AppSettings} settings
 */
function init(settings) {
    // Nedbのロード
    dbInstance = new Datastore({ filename: './db/settings.db', autoload: true });
    dbInstance.loadDatabase();
    dbInstance.setAutocompactionInterval(86400000);

    // キャッシュ領域の割当
    cache = new Map();

    // AppSettingsを保持
    appSettings = settings;

    logger.trace('モジュールが初期化された');
}

/**
 * グローバル設定からSE正規化のデフォルト値を計算
 *
 * @returns {number} 0〜100
 */
function calculateDefaultSeNormalize() {
    const config = appSettings.foleyNormalizeTargetPeak;

    // 設定がない場合のフォールバック
    if (config === undefined || config === null) {
        logger.info('foleyNormalizeTargetPeak未設定: デフォルト50を使用');
        return 50;
    }

    // 0.0〜1.0 → 0〜100 に変換
    const value = Math.round(config * 100);
    logger.debug(`foleyNormalizeTargetPeak=${config} → seNormalize=${value}`);
    return value;
}

/**
 * キャッシュからデータを取得
 * キャッシュがなければDBからロード
 *
 * @param {ServerID} serverId
 * @returns {Promise<Record>}
 */
async function loadSharedData(serverId) {
    assert(typeof serverId === 'string');

    // キャッシュにデータがあればそのまま返却
    if (cache.has(serverId)) {
        const cached = cache.get(serverId);
        logger.trace(`Settings読み込み: serverId=${serverId}, キャッシュから取得, seNormalize=${cached.seNormalize}`);
        return Promise.resolve(cached);
    }

    // キャッシュにデータがなければDBから取得
    const promise = new Promise((resolve, reject) =>
        dbInstance.findOne({ id: serverId }, (err, doc) => {
            if (err) return reject(err);

            if (doc) {
                let dict = doc.dict;
                // Note: マイグレーションはここで行う
                // スピーカー設定マイグレーション (v4->v5)
                if (typeof dict.speaker === 'string') {
                    logger.info('Speaker設定マイグレーションを開始');
                    dict.speaker = {
                        default: 'default',
                    };
                    logger.info('Speaker設定マイグレーションを終了');
                }
                // SE正規化設定マイグレーション (既存レコードにseNormalizeを追加)
                if (dict.seNormalize === undefined) {
                    const defaultSeNormalize = calculateDefaultSeNormalize();
                    logger.info(
                        `SE正規化設定マイグレーションを開始: seNormalize=${defaultSeNormalize}をデフォルト値として設定`
                    );
                    dict.seNormalize = defaultSeNormalize;
                    logger.info('SE正規化設定マイグレーションを終了');
                }
                logger.trace(`Settings読み込み: serverId=${serverId}, DBから取得, seNormalize=${dict.seNormalize}`);
                resolve(dict);
            } else {
                const defaultSeNormalize = calculateDefaultSeNormalize();
                const initialRecord = {
                    id: uuid(),
                    serverId,
                    maxCount: 0,
                    speaker: { default: 'default' },
                    seNormalize: defaultSeNormalize,
                };
                dbInstance.insert({ id: serverId, dict: initialRecord }, (err) => {
                    if (err) reject(err);
                    else resolve(initialRecord);
                });
            }
        })
    );
    const record = await promise;

    // 先をこされてなければ
    if (!cache.has(serverId)) {
        // DBから取得したものをキャッシュする
        cache.set(serverId, record);
        // データを返却する
        return Promise.resolve(record);
    }

    // 先を越されたなら先人のものを返却
    // プロセスで共有されるオブジェクトインスタンスは一つでないとまずい
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

    // キャッシュから読み上げ花子の設定データを取得
    const record = cache.get(serverId);

    // データの複製を永続化
    const dict = Object.assign({}, record);
    const promise = new Promise((resolve, reject) =>
        dbInstance.update({ id: serverId }, { $set: { dict } }, (err) => (err ? reject(err) : resolve()))
    );
    await promise;

    // 処理完了
    return Promise.resolve();
}

/**
 * DBレコードからSettingsエンティティを作成
 *
 * @param {Record} record
 * @returns {Settings}
 */
function toSettings(record) {
    assert(typeof record === 'object');

    return new Settings({
        id: record.id,
        serverId: record.serverId,
        maxCount: record.maxCount,
        speaker: record.speaker,
        seNormalize: record.seNormalize,
    });
}

/**
 * Nedb読み上げ花子の設定テーブルマネージャ
 *
 * @implements {ISettingsRepo}
 * @implements {ISettingsActionRepo}
 */
class NedbSettingsTableManager {
    /**
     * DIコンテナ用コンストラクタ
     * 初回呼び出し時にはモジュール初期化を行う
     *
     * @param {AppSettings} settings DI
     */
    constructor(settings = null) {
        const resolvedSettings = settings || Injector.resolve(AppSettings);
        if (firstCall) {
            firstCall = false;
            init(resolvedSettings);
        }
    }

    /**
     * (impl) ISettingsRepo
     *
     * @param {string} serverId
     * @returns {Promise<Settings>}
     */
    async loadSettings(serverId) {
        assert(typeof serverId === 'string');

        const record = await loadSharedData(serverId);
        const settings = toSettings(record);
        return Promise.resolve(settings);
    }

    /**
     * (impl) ISettingsActionRepo
     *
     * @param {MaxCountUpdateAction} action
     * @returns {Promise<void>}
     */
    async postMaxCountUpdate(action) {
        assert(typeof action === 'object');

        const record = await loadSharedData(action.serverId);

        // 新しくmaxCountを設定
        record.maxCount = action.maxCount;

        // 永続化
        await persistSharedData(action.serverId);
    }

    /**
     * (impl) ISettingsActionRepo
     *
     * @param {MaxCountUpdateAction} action
     * @returns {Promise<void>}
     */
    async postSpeakerUpdate(action) {
        assert(typeof action === 'object');

        const record = await loadSharedData(action.serverId);

        // 新しくspeakerを設定
        record.speaker[action.userId] = action.speaker;

        // 永続化
        await persistSharedData(action.serverId);
    }

    /**
     * (impl) ISettingsActionRepo
     *
     * @param {SeNormalizeUpdateAction} action
     * @returns {Promise<void>}
     */
    async postSeNormalizeUpdate(action) {
        assert(typeof action === 'object');

        const record = await loadSharedData(action.serverId);
        logger.debug(`SE正規化更新前: serverId=${action.serverId}, 現在のseNormalize=${record.seNormalize}`);

        // 新しくseNormalizeを設定
        record.seNormalize = action.seNormalize;
        logger.debug(`SE正規化更新後: serverId=${action.serverId}, 新しいseNormalize=${record.seNormalize}`);

        // 永続化
        await persistSharedData(action.serverId);
        logger.debug(`SE音量永続化完了: serverId=${action.serverId}`);
    }
}

// ISettingsRepoの実装として登録
ISettingsRepo.comprise(NedbSettingsTableManager, [AppSettings]);

// ISettingsActionRepoの実装として登録
ISettingsActionRepo.comprise(NedbSettingsTableManager, [AppSettings]);

module.exports = NedbSettingsTableManager;

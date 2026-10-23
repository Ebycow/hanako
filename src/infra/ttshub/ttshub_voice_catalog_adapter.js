const path = require('path');
const logger = require('log4js').getLogger(path.basename(__filename));
const axios = require('axios').default;
const errors = require('../../core/errors').promises;
const AppSettings = require('../../core/app_settings');
const IVoiceCatalogRepo = require('../../domain/repo/i_voice_catalog_repo');
const VoiceCatalog = require('../../domain/entity/voice_catalog');

// スラッシュコマンドの自動補完は3秒以内に応答する必要がある
const SEARCH_TIMEOUT_MS = 2000;
const RESOLVE_TIMEOUT_MS = 5000;
// 一覧を取得するときの 1 回あたりの件数（ttshub の上限）
const CATALOG_PAGE_SIZE = 200;
// ttshub の一覧で、話者ではなく別名・プリセットを表す kind
const NAMED_KINDS = ['alias', 'preset'];

/** @typedef {import('../../domain/repo/i_voice_catalog_repo').VoiceInfo} VoiceInfo */
/** @typedef {import('../../domain/repo/i_voice_catalog_repo').VoiceResolution} VoiceResolution */
/** @typedef {import('../../domain/entity/voice_catalog').VoiceCharacter} VoiceCharacter */

/*
 * ttshub の話者の指定（アドレス）の書式は、hanako ではこのファイルだけが知っている
 *
 *   <エンジン>:<キャラ>[/<スタイル>][?<パラメータ>]    voicevox:ずんだもん/あまあま?speed=1.2
 *   preset:<プリセット名> / <別名> / default
 *
 * ほかの場所では指定を分解せず、そのまま保存して ttshub に渡す。
 */

/**
 * 話者の指定を、話者の部分と `?` 以降のパラメータに分ける
 *
 * @param {string} query
 * @returns {{base: string, params: string}}
 */
function splitParams(query) {
    const text = query.trim();
    const i = text.indexOf('?');
    return i < 0 ? { base: text, params: '' } : { base: text.slice(0, i).trim(), params: text.slice(i) };
}

/**
 * 話者の指定からスタイルを省く（`voicevox:ずんだもん/あまあま` → `voicevox:ずんだもん`）
 *
 * @param {string} address
 * @returns {string}
 */
function characterAddressOf(address) {
    return address.split('/')[0];
}

/**
 * スタイルを省いた指定のキャラ名の部分（`voicevox:小夜-sayo` → `小夜-sayo`）
 *
 * @param {string} characterAddress
 * @returns {string}
 */
function slugOf(characterAddress) {
    return characterAddress.slice(characterAddress.indexOf(':') + 1);
}

/**
 * ttshub の話者の JSON を VoiceInfo にする
 *
 * @param {object} v
 * @returns {VoiceInfo}
 */
function toVoiceInfo(v) {
    return {
        address: v.address,
        displayName: v.display_name || v.address,
        // 別名・プリセットでは指す先の話者のエンジン
        engine: v.engine || null,
        credit: v.credit || null,
        termsUrl: v.terms_url || null,
    };
}

/**
 * ttshub の話者の JSON をキャラごとにまとめる
 *
 * @param {Array<object>} voices kind が voice のもの
 * @returns {Array<VoiceCharacter>}
 */
function groupByCharacter(voices) {
    const groups = new Map();
    for (const v of voices) {
        const address = characterAddressOf(v.address);
        if (!groups.has(address)) {
            // 指定に使う名前と元の名前が違うときは（小夜/SAYO → 小夜-sayo）、元の名前も残す
            const name = v.character && v.character !== slugOf(address) ? v.character : null;
            groups.set(address, { address, name, styles: [], available: false });
        }
        const group = groups.get(address);
        if (v.available !== false) {
            group.available = true;
        }
        if (v.style) {
            group.styles.push(v.style);
        }
    }
    return Array.from(groups.values());
}

/**
 * ttshub（TTS ゲートウェイ）の話者一覧アダプタ
 *
 * @implements {IVoiceCatalogRepo}
 */
class TtshubVoiceCatalogAdapter {
    /**
     * DIコンテナ用コンストラクタ
     *
     * @param {AppSettings} appSettings DI
     */
    constructor(appSettings) {
        this.base = appSettings.ttshubUrl.replace(/\/+$/, '');
    }

    /**
     * (impl) IVoiceCatalogRepo
     * パラメータ（`?speed=1.2` など）は検索に使わず、見つかった話者の指定と表示名に付け直す
     *
     * @param {string} input
     * @param {number} limit
     * @returns {Promise<Array<VoiceInfo>>}
     */
    async searchVoices(input, limit) {
        const { base, params } = splitParams(input);
        // 補完の候補には、エンジンが止まっていて今は読めない声を出さない
        const res = await axios.get(`${this.base}/v1/voices`, {
            params: { q: base, limit, available: true },
            timeout: SEARCH_TIMEOUT_MS,
        });
        return res.data.voices.map((v) => {
            const voice = toVoiceInfo(v);
            if (!params) return voice;
            return Object.assign(voice, {
                address: voice.address + params,
                displayName: `${voice.displayName} ${params}`,
            });
        });
    }

    /**
     * (impl) IVoiceCatalogRepo
     * パラメータ（`?speed=1.2` など）は照合に使わず、決まった話者の指定に付け直す
     *
     * @param {string} query
     * @returns {Promise<VoiceResolution>}
     */
    async resolveVoice(query) {
        const { base, params } = splitParams(query);
        if (base === '' || base === 'default') {
            return {
                voice: { address: `default${params}`, displayName: 'デフォルト', engine: null, credit: null },
                suggestions: [],
            };
        }

        let data;
        try {
            const res = await axios.get(`${this.base}/v1/voices/resolve`, {
                params: { q: base },
                timeout: RESOLVE_TIMEOUT_MS,
            });
            data = res.data;
        } catch (err) {
            return errors.disappointed(
                `ttshub-unavailable ${err.message}`,
                '声の一覧を確認できなかったよ。しばらくしてからもう一度試してね'
            );
        }

        if (!data.match) {
            const suggestions = data.suggestions.map((address) => ({
                address,
                displayName: address,
                engine: null,
                credit: null,
            }));
            return { voice: null, suggestions };
        }
        const voice = data.voice ? toVoiceInfo(data.voice) : toVoiceInfo({ address: data.match });
        return { voice: Object.assign(voice, { address: data.match + params }), suggestions: [] };
    }

    /**
     * (impl) IVoiceCatalogRepo
     * ttshub から一覧を全件取得し、キャラごとにまとめる
     *
     * @returns {Promise<VoiceCatalog>}
     */
    async loadVoiceCatalog() {
        const voices = [];
        const named = [];
        let cursor = null;
        try {
            do {
                const res = await axios.get(`${this.base}/v1/voices`, {
                    params: Object.assign({ limit: CATALOG_PAGE_SIZE }, cursor ? { cursor } : {}),
                    timeout: RESOLVE_TIMEOUT_MS,
                });
                for (const v of res.data.voices) {
                    if (NAMED_KINDS.includes(v.kind)) {
                        named.push({ name: v.address, target: v.target });
                    } else {
                        voices.push(v);
                    }
                }
                cursor = res.data.next_cursor;
            } while (cursor);
        } catch (err) {
            logger.warn('ttshubから話者の一覧を取得できなかった', err.message);
            return errors.disappointed(
                `ttshub-unavailable ${err.message}`,
                '声の一覧を取得できなかったよ。しばらくしてからもう一度試してね'
            );
        }
        return new VoiceCatalog({ characters: groupByCharacter(voices), named });
    }
}

// IVoiceCatalogRepoの実装として登録
IVoiceCatalogRepo.comprise(TtshubVoiceCatalogAdapter, [AppSettings]);

module.exports = TtshubVoiceCatalogAdapter;

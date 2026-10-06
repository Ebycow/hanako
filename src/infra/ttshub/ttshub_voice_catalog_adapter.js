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
// 取得した一覧をこの間は使い回す（過ぎたら裏で取り直す）
const CATALOG_TTL_MS = 60000;
// 一覧を取得するときの 1 回あたりの件数（ttshub の上限）
const CATALOG_PAGE_SIZE = 200;
// ttshub の一覧で、話者ではなく別名・プリセットを表す kind
const NAMED_KINDS = ['alias', 'preset'];

/** @typedef {import('../../domain/repo/i_voice_catalog_repo').VoiceInfo} VoiceInfo */
/** @typedef {import('../../domain/repo/i_voice_catalog_repo').VoiceResolution} VoiceResolution */

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
        character: v.character || null,
        style: v.style || null,
        available: v.available !== false,
    };
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
        /** @type {?{catalog: VoiceCatalog, fetchedAt: number}} */
        this.cache = null;
        /** @type {?Promise<VoiceCatalog>} */
        this.refreshing = null;
    }

    /**
     * (impl) IVoiceCatalogRepo
     *
     * @param {string} query
     * @param {number} limit
     * @returns {Promise<Array<VoiceInfo>>}
     */
    async searchVoices(query, limit) {
        // 補完の候補には、エンジンが止まっていて今は読めない声を出さない
        const res = await axios.get(`${this.base}/v1/voices`, {
            params: { q: query, limit, available: true },
            timeout: SEARCH_TIMEOUT_MS,
        });
        return res.data.voices.map(toVoiceInfo);
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
     * 一覧は花子モデルの一部として、発言などのイベントのたびに読み込まれる。読み上げを遅らせないよう、ttshub との通信は待たない。
     * 手元の一覧（なければ取得できなかった一覧）をすぐ返し、一覧がないか古ければ裏で取り直す
     *
     * @returns {Promise<VoiceCatalog>}
     */
    async loadVoiceCatalog() {
        if (!this.cache || Date.now() - this.cache.fetchedAt >= CATALOG_TTL_MS) {
            this.refresh().catch(() => {});
        }
        return this.cache ? this.cache.catalog : VoiceCatalog.unavailable();
    }

    /**
     * 一覧を取り直す。取り直している最中に呼ばれたら、同じ取得を待つ
     *
     * @returns {Promise<VoiceCatalog>}
     * @private
     */
    refresh() {
        if (!this.refreshing) {
            this.refreshing = fetchCatalogF
                .call(this)
                .then((catalog) => {
                    this.cache = { catalog, fetchedAt: Date.now() };
                    return catalog;
                })
                .catch((err) => {
                    logger.warn('ttshubから話者の一覧を取得できなかった', err.message);
                    throw err;
                })
                .finally(() => {
                    this.refreshing = null;
                });
        }
        return this.refreshing;
    }
}

/**
 * (private) ttshub から一覧を全件取得する
 *
 * @this {TtshubVoiceCatalogAdapter}
 * @returns {Promise<VoiceCatalog>}
 */
async function fetchCatalogF() {
    const voices = [];
    const named = [];
    let cursor = null;
    do {
        const res = await axios.get(`${this.base}/v1/voices`, {
            params: Object.assign({ limit: CATALOG_PAGE_SIZE }, cursor ? { cursor } : {}),
            timeout: RESOLVE_TIMEOUT_MS,
        });
        for (const v of res.data.voices) {
            if (NAMED_KINDS.includes(v.kind)) {
                named.push({ name: v.address, target: v.target });
            } else {
                voices.push(toVoiceInfo(v));
            }
        }
        cursor = res.data.next_cursor;
    } while (cursor);
    return new VoiceCatalog({ available: true, voices, named });
}

// IVoiceCatalogRepoの実装として登録
IVoiceCatalogRepo.comprise(TtshubVoiceCatalogAdapter, [AppSettings]);

module.exports = TtshubVoiceCatalogAdapter;

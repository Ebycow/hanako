const axios = require('axios').default;
const errors = require('../../core/errors').promises;
const AppSettings = require('../../core/app_settings');
const IVoiceCatalogRepo = require('../../domain/repo/i_voice_catalog_repo');

// スラッシュコマンドの自動補完は3秒以内に応答する必要がある
const SEARCH_TIMEOUT_MS = 2000;
const RESOLVE_TIMEOUT_MS = 5000;
// ttshub の一覧で、話者ではなく別名・プリセットを表すエンジン名
const NAMED_ENGINES = ['alias', 'preset'];

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
        engine: v.engine && !NAMED_ENGINES.includes(v.engine) ? v.engine : null,
        credit: v.credit || null,
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
    }

    /**
     * (impl) IVoiceCatalogRepo
     *
     * @param {string} query
     * @param {number} limit
     * @returns {Promise<Array<VoiceInfo>>}
     */
    async searchVoices(query, limit) {
        const res = await axios.get(`${this.base}/v1/voices`, {
            params: { q: query, limit },
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
}

// IVoiceCatalogRepoの実装として登録
IVoiceCatalogRepo.comprise(TtshubVoiceCatalogAdapter, [AppSettings]);

module.exports = TtshubVoiceCatalogAdapter;

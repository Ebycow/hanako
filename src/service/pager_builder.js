const assert = require('assert').strict;
const errors = require('../core/errors').promises;
const Injector = require('../core/injector');
const Pager = require('../domain/model/pager');
const VoiceCatalog = require('../domain/entity/voice_catalog');
const IVoiceCatalogRepo = require('../domain/repo/i_voice_catalog_repo');

/** @typedef {import('../domain/model/hanako')} Hanako */
/** @typedef {import('../domain/model/pager').Pageable} Pageable */

/**
 * アプリケーションサービス
 * ページ管理モデルの生成
 */
class PagerBuilder {
    /**
     * @param {null} voiceCatalogRepo DI
     */
    constructor(voiceCatalogRepo = null) {
        this.voiceCatalogRepo = voiceCatalogRepo || Injector.resolve(IVoiceCatalogRepo);
    }

    /**
     * ページ表示テキストからPagerモデルを復元する
     * - 復元できない時 erros.unexpected
     * - 読み上げキャラクターの一覧を読み込めない時 errors.disappointed
     *
     * @param {Hanako} hanako 読み上げ花子モデル
     * @param {string} pagerText ページ表示テキスト
     * @returns {Promise<Pager>} 復元されたPager
     */
    async build(hanako, pagerText) {
        assert(typeof hanako === 'object');
        assert(typeof pagerText === 'string');

        // Pageableディスクリプタを取得
        const args = pagerText.split(/\s/);
        const descriptor = args[0];

        // ディスクリプタからPageableを同定
        const pageable = await findPageableF.call(this, hanako, descriptor);
        if (!pageable) {
            return errors.unexpected(`対応するPageableがない ${descriptor} ${pagerText}`);
        }

        // ページインデックスを取得
        const currentIndex = Number.parseInt(args[1], 10);
        if (Number.isNaN(currentIndex)) {
            return errors.unexpected(`ページングインデックスが取得できない ${args} ${pagerText}`);
        }

        // Pagerを復元して返却
        const pager = new Pager(pageable, currentIndex);
        return Promise.resolve(pager);
    }
}

/**
 * (private) ディスクリプタに対応するPageableを探す
 * 読み上げキャラクターの一覧はサーバーによらず花子モデルにも含まないため、ページを送るたびに読み込む
 *
 * @this {PagerBuilder}
 * @param {Hanako} hanako 読み上げ花子モデル
 * @param {string} descriptor Pageableディスクリプタ
 * @returns {Promise<?Pageable>} 見つからなければ null
 */
async function findPageableF(hanako, descriptor) {
    if (descriptor === VoiceCatalog.descriptor) {
        return this.voiceCatalogRepo.loadVoiceCatalog();
    }
    return hanako.pageables.find((p) => p.descriptor === descriptor) || null;
}

module.exports = PagerBuilder;

const assert = require('assert').strict;
const errors = require('../core/errors').promises;
const Pager = require('../domain/model/pager');

/** @typedef {import('../domain/model/hanako')} Hanako */

/**
 * アプリケーションサービス
 * ページ管理モデルの生成
 */
class PagerBuilder {
    /**
     * ページ表示テキストからPagerモデルを復元する
     * - 復元できない時 erros.unexpected
     *
     * @param {Hanako} hanako 読み上げ花子モデル
     * @param {string} pagerText ページ表示テキスト
     * @returns {Promise<Pager>} 復元されたPager
     */
    async build(hanako, pagerText) {
        assert(typeof hanako === 'object');
        assert(typeof pagerText === 'string');

        // ページ管理可能なものを纏める
        const pageables = [hanako.wordDictionary];

        // Pageableディスクリプタを取得
        const args = pagerText.split(/\s/);
        const descriptor = args[0];

        // ディスクリプタからPageableを同定
        const pageable = pageables.find(p => p.descriptor === descriptor);
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

module.exports = PagerBuilder;

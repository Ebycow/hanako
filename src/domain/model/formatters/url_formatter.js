const assert = require('assert').strict;
const utils = require('../../../core/utils');

/** @typedef {import('../../model/hanako')} Hanako */

/**
 * ドメインモデル
 * URLフォーマッター
 */
class UrlFormatter {
    /**
     * @returns {'url'}
     */
    get type() {
        return 'url';
    }

    /**
     * URL文字列の全置換を実行
     *
     * @param {string} text 入力文字列
     * @returns {string} 出力文字列
     */
    format(text) {
        assert(typeof text === 'string');

        // 空文字列はフォーマット処理しない
        if (utils.countUnicode(text) === 0) {
            return '';
        }

        // URLをすべて置換
        return utils.neutralizeUrls(text, 'URL');
    }
}

module.exports = UrlFormatter;

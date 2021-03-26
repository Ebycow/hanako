const assert = require('assert').strict;
const utils = require('../../../core/utils');

/** @typedef {import('../../model/hanako')} Hanako */

/**
 * ドメインモデル
 * 最大読み上げ文字数フォーマッター
 */
class LimitFormatter {
    /**
     * @returns {'limit'}
     */
    get type() {
        return 'limit';
    }

    /**
     * @param {Hanako} hanako フォーマッター実行下の読み上げ花子モデル
     */
    constructor(hanako) {
        this.hanako = hanako;
    }

    /**
     * 最大読み上げ文字数を適用
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

        // maxCount設定値が0なら処理しない
        const maxCount = this.hanako.settings.maxCount;
        if (maxCount === 0) {
            return text;
        }

        // 文字数がmaxCount以下なら処理しない
        if (utils.countUnicode(text) <= maxCount) {
            return text;
        }

        // 読み上げ文字数制限を適用
        const ellipsis = 'イか略。'; // 発音が(・∀・)ｲｲ!!
        return [...Array.from(text).slice(0, maxCount), ellipsis].join('');
    }
}

module.exports = LimitFormatter;

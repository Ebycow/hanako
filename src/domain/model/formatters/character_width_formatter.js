const assert = require('assert').strict;
const utils = require('../../../core/utils');

/** @typedef {import('../../model/hanako')} Hanako */

/**
 * ドメインモデル
 * 文字種統一フォーマッター
 * 辞書登録の重複を減らすため、辞書と照合する前に全角英数字・半角カナをそろえる
 */
class CharacterWidthFormatter {
    /**
     * @returns {'character_width'}
     */
    get type() {
        return 'character_width';
    }

    /**
     * 文字種統一を実行
     *
     * @param {string} text 入力文字列
     * @returns {string} 出力文字列
     */
    format(text) {
        assert(typeof text === 'string');

        return utils.unifyCharacterWidth(text);
    }
}

module.exports = CharacterWidthFormatter;

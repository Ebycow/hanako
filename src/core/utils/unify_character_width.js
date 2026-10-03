const assert = require('assert').strict;

// 全角英数字（０-９、Ａ-Ｚ、ａ-ｚ）
const fullwidthAlnumRe = /[０-９Ａ-Ｚａ-ｚ]/g;

// 半角カナ（句読点・長音・濁点を含む）の連続
const halfwidthKanaRe = /[｡-ﾟ]+/g;

// 全角と半角のコードポイントの差
const WIDTH_OFFSET = 0xfee0;

/**
 * 辞書と照合する前に文字種をそろえる
 * - 全角英数字を半角にする
 * - 半角カナを全角にする（ｶﾞ → ガ のように濁点も合成する）
 *
 * NFKCで文字列全体を正規化しないのは、全角の「～」「！」など
 * 読み上げ方が変わり得る記号まで変換されてしまうため。
 *
 * @param {string} text 対象文字列
 * @returns {string} 文字種をそろえた文字列
 */
function unifyCharacterWidth(text) {
    assert(typeof text === 'string');

    return text
        .replace(fullwidthAlnumRe, (c) => String.fromCharCode(c.charCodeAt(0) - WIDTH_OFFSET))
        .replace(halfwidthKanaRe, (s) => s.normalize('NFKC'));
}

module.exports = unifyCharacterWidth;

const assert = require('assert').strict;

/** 1000倍ごとの単位（SI接頭辞） */
const UNITS = ['B', 'kB', 'MB', 'GB', 'TB', 'PB'];

/**
 * バイト数を人が読みやすい表記にする（例: 2000000 → "2MB"、1500 → "1.5kB"）
 * 有効数字3桁、1000区切りのSI単位で、数値と単位の間に空白は入れない
 *
 * @param {number} bytes バイト数（0以上）
 * @returns {string} 表記
 */
function formatBytes(bytes) {
    assert(Number.isFinite(bytes) && bytes >= 0);

    let exponent = bytes < 1 ? 0 : Math.min(Math.floor(Math.log10(bytes) / 3), UNITS.length - 1);
    let value = Number((bytes / 1000 ** exponent).toPrecision(3));
    // 999999 のように丸めで 1000 に繰り上がったら次の単位にする
    if (value >= 1000 && exponent < UNITS.length - 1) {
        exponent += 1;
        value = Number((bytes / 1000 ** exponent).toPrecision(3));
    }
    return `${value}${UNITS[exponent]}`;
}

module.exports = formatBytes;

const assert = require('assert').strict;

/**
 * 文字列のUnicodeコードポイント数をカウント
 *
 * @param {string} string 文字列
 * @returns {number} コードポイント数
 */
function countUnicode(string) {
    assert(typeof string === 'string');

    // via: https://blog.jxck.io/entries/2017-03-02/unicode-in-javascript.html
    // TODO FUTURE ネイティブでカウントできるようになったら置き換える
    return Array.from(string).length;
}

module.exports = countUnicode;

const assert = require('assert').strict;

// URLの正規表現
const urlRe = /((ftp|http|https):\/\/(\w+:{0,1}\w*@)?(\S+)(:[0-9]+)?(\/|\/([\w#!:.?+=&%@!\-/]))?)/gi;

/**
 * 文字列に含まれるURLを一律ですべて置換
 *
 * @param {string} text 対象文字列
 * @param {string} [replaceValue='URL'] 置き換え文字列 省略時は'URL'
 * @return {string} 置き換え結果
 */
function neutralizeUrls(text, replaceValue = 'URL') {
    assert(typeof text === 'string');
    assert(typeof replaceValue === 'string');

    // 置き換え
    return text.replace(urlRe, replaceValue);
}

module.exports = neutralizeUrls;

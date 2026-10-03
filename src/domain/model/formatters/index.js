// 上から下へ
const chain = [
    require('./character_width_formatter'),
    require('./url_formatter'),
    require('./word_dictionary_formatter'),
    require('./cyrillic_katakana_formatter'),
    require('./limit_formatter'),
];

/**
 * 文字列フォーマッターモデル読み込み用インデックス
 */
module.exports = {
    get sorted() {
        return chain.slice();
    },
};

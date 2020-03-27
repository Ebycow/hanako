// 上から下へ
const chain = [require('./word_dictionary_formatter')];

/**
 * 文字列フォーマッターモデル読み込み用インデックス
 */
module.exports = {
    get sorted() {
        return chain.slice();
    },
};
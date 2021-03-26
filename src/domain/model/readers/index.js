// 上から下へ
const chain = [require('./foley_reader'), require('./terminal_reader')];

/**
 * 読み上げモデル読み込み用インデックス
 */
module.exports = {
    get sorted() {
        return chain.slice();
    },
};

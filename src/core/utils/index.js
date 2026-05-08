const utils = {
    countUnicode: require('./count_unicode'),
    neutralizeUrls: require('./neutralize_urls'),
    ensure: require('./ensure'),
    levenshteinDistance: require('./levenshtein_distance'),
};

/**
 * ユーティリティ関数読み込み用インデックス
 */
module.exports = utils;

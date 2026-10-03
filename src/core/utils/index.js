const utils = {
    countUnicode: require('./count_unicode'),
    neutralizeUrls: require('./neutralize_urls'),
    ensure: require('./ensure'),
    levenshteinDistance: require('./levenshtein_distance'),
    sanitizeContent: require('./sanitize_content'),
    unifyCharacterWidth: require('./unify_character_width'),
};

/**
 * ユーティリティ関数読み込み用インデックス
 */
module.exports = utils;

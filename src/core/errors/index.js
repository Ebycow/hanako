const types = {
    Abort: require('./eby_abort_error'),
    Unexpected: require('./eby_unexpected_error'),
    Disappointed: require('./eby_disappointed_error'),
};

const promises = {
    abort: (reason, ...params) => Promise.reject(new types.Abort(reason, ...params)),
    unexpected: (reason, ...params) => Promise.reject(new types.Unexpected(reason, ...params)),
    disappointed: (reason, ...param) => Promise.reject(new types.Disappointed(reason, ...param)),
};

/**
 * エラー読み込み用インデックス
 */
module.exports = {
    types,
    promises,
};

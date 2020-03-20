const types = {
    Abort: require('./eby_abort_error'),
    Unexpected: require('./eby_unexpected_error'),
};

const promises = {
    abort: (reason, ...params) => Promise.reject(new types.Abort(reason, ...params)),
    unexpected: (reason, ...params) => Promise.reject(new types.Unexpected(reason, ...params)),
};

/**
 * エラー読み込み用インデックス
 */
module.exports = {
    types,
    promises,
};

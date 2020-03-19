const types = {
    Abort: require('./eby_abort_error'),
};

const promises = {
    abort: reason => Promise.reject(new types.Abort(reason)),
};

/**
 * エラー読み込み用インデックス
 */
module.exports = {
    types,
    promises,
};

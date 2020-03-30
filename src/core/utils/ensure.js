const assert = require('assert').strict;
const EbyAbortError = require('../errors/eby_abort_error');

/**
 * 判定式が真でないときEbyAbortErrorを発生させる
 *
 * @param {boolean} condition 判定式
 */
function ensure(condition) {
    assert(typeof condition === 'boolean');

    if (!condition) throw new EbyAbortError();
}

module.exports = ensure;

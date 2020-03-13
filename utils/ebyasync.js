const assert = require('assert').strict;

/**
 * 非同期処理のユーティリティクラス
 */
class EbyAsync {
    /**
     * ねむる
     *
     * @param {number} msec
     * @returns {Promise<void>}
     */
    static sleep(msec) {
        assert(typeof msec === 'number', 'msecは数字');
        assert(Number.isInteger(msec) && msec >= 0, 'msecは正の整数');
        return new Promise(resolve => setTimeout(() => resolve(), msec));
    }
}

module.exports = {
    EbyAsync,
};

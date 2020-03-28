const assert = require('assert').strict;

/** @typedef {import('../domain/model/pager')} Pager */

/**
 * アプリケーションサービス
 * ページめくりを行う
 */
class PagerService {
    /**
     * 入力に従いページめくりを行い次のページテキストを返却する
     *
     * @param {Pager} pager ページ管理モデル
     * @param {'forward'|'backward'} direction ページめくり方向
     * @returns {Promise<string>} 次のページテキスト
     */
    async serve(pager, direction) {
        assert(typeof pager === 'object');
        assert(direction === 'forward' || direction === 'backward');

        if (direction === 'forward') {
            pager.forward();
        } else if (direction === 'backward') {
            pager.backward();
        } else {
            throw new Error('unreachable');
        }

        return Promise.resolve(pager.show());
    }
}

module.exports = PagerService;

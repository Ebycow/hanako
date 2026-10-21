/**
 * 2xx 以外の応答で失敗したことを表すエラー
 * URL はクエリを除いて持つ（クエリには発言本文が載りうる）
 */
class HttpStatusError extends Error {
    /**
     * @param {number} status
     * @param {string} method
     * @param {string|URL} url
     */
    constructor(status, method, url) {
        super(`HTTP ${status} で失敗した`);
        this.name = 'HttpStatusError';
        this.status = status;
        this.method = method;
        const { origin, pathname } = new URL(url);
        this.url = origin + pathname;
    }
}

/**
 * fetch して、2xx 以外の応答なら本文を捨てて HttpStatusError で失敗させる
 * 中断されたときは signal の reason で失敗する（fetch の仕様）
 *
 * @param {string|URL} url
 * @param {RequestInit} [init]
 * @returns {Promise<Response>}
 */
async function fetchOk(url, init = {}) {
    const res = await fetch(url, init);
    if (!res.ok) {
        await res.body?.cancel().catch(() => {});
        throw new HttpStatusError(res.status, init.method || 'GET', url);
    }
    return res;
}

/**
 * 2xx 以外の応答で失敗したエラーかどうか
 *
 * @param {any} err
 * @returns {boolean}
 */
function isHttpStatusError(err) {
    return err.name === 'HttpStatusError';
}

/**
 * URL にクエリを付ける
 *
 * @param {string} url
 * @param {Object<string, any>} params 値は文字列にして付ける
 * @returns {URL}
 */
function withQuery(url, params) {
    const u = new URL(url);
    for (const [key, value] of Object.entries(params)) {
        u.searchParams.set(key, String(value));
    }
    return u;
}

/**
 * 通信エラーのコード（ECONNRESET など）
 * fetch は通信エラーを TypeError('fetch failed') に包み、元のエラーを cause に入れる
 *
 * @param {any} err
 * @returns {string|undefined}
 */
function networkErrorCode(err) {
    return err.code ?? err.cause?.code;
}

module.exports = {
    HttpStatusError,
    isHttpStatusError,
    fetchOk,
    withQuery,
    networkErrorCode,
};

const http = require('http');
const https = require('https');
const { HttpStatusError } = require('./fetch_ok');

/** リダイレクトを辿る最大回数 */
const MAX_REDIRECTS = 5;

/** Location に従うステータス */
const REDIRECT_STATUSES = [301, 302, 303, 307, 308];

/** サイズの上限を超えたときのエラーコード */
const CONTENT_TOO_LARGE_CODE = 'EHANAKO_CONTENT_TOO_LARGE';

/** リダイレクトが多すぎたときのエラーコード */
const TOO_MANY_REDIRECTS_CODE = 'EHANAKO_TOO_MANY_REDIRECTS';

/**
 * @param {number} maxBytes
 * @returns {Error}
 */
function contentTooLargeError(maxBytes) {
    return Object.assign(new Error(`${maxBytes}バイトを超えるデータ`), { code: CONTENT_TOO_LARGE_CODE });
}

/**
 * サイズの上限を超えたことによるエラーかどうか
 *
 * @param {any} err
 * @returns {boolean}
 */
function isContentTooLargeError(err) {
    return err.code === CONTENT_TOO_LARGE_CODE;
}

/**
 * GET を送り、応答ヘッダが届いたら応答を返す
 *
 * @param {URL} target
 * @param {{ http: http.Agent, https: https.Agent }} [agents]
 * @param {AbortSignal} [signal] 応答の受信中に中断されたときも接続を切る
 * @returns {Promise<http.IncomingMessage>}
 */
function get(target, agents, signal) {
    return new Promise((resolve, reject) => {
        const secure = target.protocol === 'https:';
        const agent = agents && (secure ? agents.https : agents.http);
        const req = (secure ? https : http).get(target, { agent, signal }, resolve);
        req.on('error', reject);
    });
}

/**
 * 本文を上限まで読み取る
 *
 * @param {http.IncomingMessage} res
 * @param {number} maxBytes
 * @returns {Promise<Buffer>}
 */
async function readBody(res, maxBytes) {
    if (Number(res.headers['content-length']) > maxBytes) {
        res.destroy();
        throw contentTooLargeError(maxBytes);
    }
    const chunks = [];
    let size = 0;
    for await (const chunk of res) {
        size += chunk.length;
        // 途中で抜けると応答は破棄される
        if (size > maxBytes) throw contentTooLargeError(maxBytes);
        chunks.push(chunk);
    }
    return Buffer.concat(chunks, size);
}

/**
 * URL の中身をダウンロードする
 * リダイレクトは自前で辿り、初回の接続先とリダイレクト先のどちらも assertTarget で検査する
 *
 * @param {string} url
 * @param {object} options
 * @param {number} options.maxBytes 本文の最大バイト数。超えたら読むのをやめて失敗する
 * @param {AbortSignal} [options.signal] 中断・期限の合図。中断されたら signal の reason で失敗する
 * @param {{ http: http.Agent, https: https.Agent }} [options.agents]
 * @param {(target: URL) => void} [options.assertTarget] 接続してはいけない先なら例外を投げる
 * @returns {Promise<{ status: number, headers: http.IncomingHttpHeaders, data: Buffer }>}
 */
async function download(url, { maxBytes, signal, agents, assertTarget = () => {} }) {
    let target = new URL(url);
    try {
        for (let redirects = 0; ; redirects++) {
            assertTarget(target);
            const res = await get(target, agents, signal);

            if (REDIRECT_STATUSES.includes(res.statusCode) && res.headers.location) {
                res.resume();
                if (redirects >= MAX_REDIRECTS) {
                    throw Object.assign(new Error(`リダイレクトが${MAX_REDIRECTS}回を超えた`), {
                        code: TOO_MANY_REDIRECTS_CODE,
                    });
                }
                target = new URL(res.headers.location, target);
                continue;
            }
            if (res.statusCode < 200 || res.statusCode >= 300) {
                res.resume();
                throw new HttpStatusError(res.statusCode, 'GET', target);
            }
            return { status: res.statusCode, headers: res.headers, data: await readBody(res, maxBytes) };
        }
    } catch (err) {
        // 中断で切れた接続のエラー（AbortError や ECONNRESET）ではなく、中断の理由を伝える
        if (signal && signal.aborted) throw signal.reason;
        throw err;
    }
}

module.exports = {
    download,
    isContentTooLargeError,
};

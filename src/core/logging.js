const fs = require('fs');
const util = require('util');
const log4js = require('log4js');

/**
 * ログ出力の方針
 *
 * ログには利用者の発言本文・入力文字列・ユーザー名を残さない。
 * 出してよいのは ID・件数・文字数・エラー種別などの運用情報のみ。
 *
 * 各所の logger 呼び出しで気をつけるのに加えて、最後の砦として
 * エラーオブジェクトはこのレイアウトで要約してから出力する。
 * （util.inspect でエラーを丸ごと出すと、axios の config.params などに
 *   含まれる発言本文がそのままログに残るため）
 */

/** エラーの cause を辿る最大深さ */
const MAX_CAUSE_DEPTH = 3;

/**
 * 数値を指定桁でゼロ埋め
 *
 * @param {number} n
 * @param {number} width
 * @returns {string}
 */
function pad(n, width = 2) {
    return String(n).padStart(width, '0');
}

/**
 * ローカル時刻の ISO8601 風タイムスタンプ（例: 2026-09-25T20:14:03.123）
 *
 * @param {Date} date
 * @returns {string}
 */
function formatTimestamp(date) {
    return (
        `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}` +
        `T${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}.${pad(date.getMilliseconds(), 3)}`
    );
}

/**
 * URL からクエリ文字列とフラグメントを取り除く（クエリには発言本文が載りうる）
 *
 * @param {string} url
 * @returns {string}
 */
function stripQuery(url) {
    if (typeof url !== 'string') return String(url);
    const index = url.search(/[?#]/);
    return index === -1 ? url : url.slice(0, index);
}

/**
 * エラーらしきオブジェクトかどうか
 *
 * @param {any} value
 * @returns {boolean}
 */
function isErrorLike(value) {
    return (
        value instanceof Error ||
        (value !== null && typeof value === 'object' && 'stack' in value && 'message' in value)
    );
}

/**
 * スタックトレースからメッセージ行を除いたフレーム部分を取り出す
 *
 * @param {Error} err
 * @returns {string}
 */
function stackFrames(err) {
    if (typeof err.stack !== 'string') return '';
    return err.stack
        .split('\n')
        .filter((line) => /^\s+at /.test(line))
        .join('\n');
}

/**
 * エラーの付帯情報（code, status など）を要約する。
 * 発言本文が入りうる config / request / response の中身は出さない。
 *
 * @param {Error} err
 * @returns {string}
 */
function describeErrorDetails(err) {
    const details = [];
    if (err.code !== undefined) details.push(`code=${err.code}`);
    if (err.isAxiosError) {
        if (err.response && err.response.status !== undefined) details.push(`status=${err.response.status}`);
        if (err.config) {
            if (err.config.method) details.push(`method=${String(err.config.method).toUpperCase()}`);
            if (err.config.url) details.push(`url=${stripQuery(err.config.url)}`);
        }
    }
    if (err.syscall !== undefined) details.push(`syscall=${err.syscall}`);
    if (typeof err.hostname === 'string') details.push(`hostname=${err.hostname}`);
    return details.length > 0 ? ` (${details.join(', ')})` : '';
}

/**
 * エラーを発言本文を含まない形に要約して文字列化する
 *
 * @param {Error} err
 * @param {number} depth cause の再帰深さ
 * @returns {string}
 */
function formatError(err, depth = 0) {
    const name = err.name || 'Error';
    const lines = [`${name}: ${err.message}${describeErrorDetails(err)}`];

    const frames = stackFrames(err);
    if (frames) lines.push(frames);

    // AggregateError は内包するエラーを 1 行ずつ要約する
    if (Array.isArray(err.errors)) {
        for (const inner of err.errors) {
            if (isErrorLike(inner)) {
                lines.push(`  - ${inner.name || 'Error'}: ${inner.message}${describeErrorDetails(inner)}`);
            }
        }
    }

    if (err.cause !== undefined && depth < MAX_CAUSE_DEPTH) {
        const cause = isErrorLike(err.cause) ? formatError(err.cause, depth + 1) : '[non-error cause]';
        lines.push(`Caused by: ${cause}`);
    }

    return lines.join('\n');
}

/**
 * ログ引数ひとつを文字列化する
 *
 * @param {any} arg
 * @returns {string}
 */
function formatArg(arg) {
    if (typeof arg === 'string') return arg;
    if (isErrorLike(arg)) return formatError(arg);
    return util.inspect(arg, { depth: 2, breakLength: Infinity });
}

/**
 * log4js のログイベントを 1 レコードに整形する
 *
 * @param {object} logEvent log4js の LoggingEvent
 * @returns {string}
 */
function formatLogEvent(logEvent) {
    const data = logEvent.data.map(formatArg).join(' ');
    return `[${formatTimestamp(logEvent.startTime)}] [${logEvent.level.levelStr}] ${logEvent.categoryName} - ${data}`;
}

/**
 * log4js を設定する
 *
 * 環境変数 LOG_LEVEL で出力レベルを上書きできる（例: LOG_LEVEL=trace）。
 * レベルを下げても発言本文は出ない。
 *
 * @param {string} configPath log4js 設定 JSON のパス
 */
function configure(configPath) {
    log4js.addLayout('hanako', () => formatLogEvent);

    const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    if (process.env.LOG_LEVEL) {
        for (const category of Object.values(config.categories)) {
            category.level = process.env.LOG_LEVEL;
        }
    }
    log4js.configure(config);
}

module.exports = {
    configure,
    formatError,
    formatLogEvent,
    stripQuery,
};

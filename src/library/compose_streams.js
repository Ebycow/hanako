const { compose } = require('stream');

/**
 * stream.compose でつなぎ、つないだ各ストリームのエラーを受けておく
 *
 * compose は、最後のストリームの書き込み側が終わった時点（HTTPの応答を受け取り終えた時点など）で
 * 各ストリームのエラーの受け手を外す。その後、読み切る前に破棄すると、途中のストリームが
 * AbortError を受け手なしで出して uncaughtException になる（受信を終えた音声を再生中にスキップしたときなど）。
 * つないでいる間のエラーは compose が返すストリームに伝わるため、ここでは受けるだけでよい。
 *
 * @param {...import('stream').Stream} streams つなぐストリーム
 * @returns {import('stream').Duplex}
 */
function composeStreams(...streams) {
    for (const stream of streams) {
        stream.on('error', () => {});
    }
    return compose(...streams);
}

module.exports = composeStreams;

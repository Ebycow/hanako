const { Readable } = require('stream');
const { fetchOk, withQuery, networkErrorCode } = require('../http/fetch_ok');
const transforms = require('../../library/transforms');
const AppSettings = require('../../core/app_settings');
const IVoiceroidStreamRepo = require('../../domain/repo/i_voiceroid_stream_repo');
const log4js = require('log4js');
const composeStreams = require('../../library/compose_streams');

const logger = log4js.getLogger(require('path').basename(__filename));
const STREAMING_API_PATH = '/api/v2/audiostream';
// 応答が始まるまでの上限。Ebyroidのキュー待ち上限（--queue-timeout-ms、既定10秒）より長くし、
// 混雑時はこちらで打ち切るより先にEbyroidの503を受け取れるようにする。
// Ebyroidは最初のPCMを生成した時点で応答を始めるため、生成の開始までもここに含まれる。
const RESPONSE_TIMEOUT_MS = 15000;
// 応答が始まった後、読み手が待っているのにPCMが届かない時間の上限
const BODY_STALL_TIMEOUT_MS = 10000;

function resolveMode(url, configuredMode) {
    if (configuredMode !== 'auto') return configuredMode;
    try {
        const pathname = new URL(url).pathname.replace(/\/$/, '');
        return pathname === STREAMING_API_PATH ? 'streaming-post' : 'legacy-get';
    } catch {
        return 'legacy-get';
    }
}

/** @typedef {import('stream').Readable} Readable */
/** @typedef {import('../../domain/entity/audios/voiceroid_audio')} VoiceroidAudio */

/**
 * EbyroidオーディオストリームAPIアダプタ
 *
 * @implements {IVoiceroidStreamRepo}
 */
class EbyroidStreamApiAdapter {
    /**
     * DIコンテナ用コンストラクタ
     *
     * @param {AppSettings} appSettings DI
     */
    constructor(appSettings) {
        this.url = appSettings.ebyroidStreamApiUrl;
        this.mode = resolveMode(this.url, appSettings.ebyroidStreamApiMode || 'auto');
    }

    /**
     * (impl) IVoiceroidStreamRepo
     *
     * @param {VoiceroidAudio} audio
     * @param {AbortSignal} [signal] 中断の合図。応答の受信中に中断されてもレスポンスを破棄する
     * @returns {Promise<Readable>}
     */
    async getVoiceroidStream(audio, signal) {
        const params = {
            text: audio.content,
        };

        if (audio.speaker !== 'default') {
            params.name = audio.speaker;
        }

        // 応答が始まるまでの期限。応答を受け取ったら解除する。
        // fetchは本文の受信が終わるまでsignalを見続けるため、期限をAbortSignal.timeoutにすると受信中に切れてしまう。
        const responseTimeout = new AbortController();
        const timer = setTimeout(
            () => responseTimeout.abort(new Error(`Ebyroidの応答が${RESPONSE_TIMEOUT_MS}ms以内に始まらなかった`)),
            RESPONSE_TIMEOUT_MS
        );
        const requestSignal = signal ? AbortSignal.any([signal, responseTimeout.signal]) : responseTimeout.signal;

        const maxRetries = 3;
        let response;
        try {
            for (let attempt = 1; attempt <= maxRetries; attempt++) {
                try {
                    if (this.mode === 'streaming-post') {
                        response = await fetchOk(this.url, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify(params),
                            signal: requestSignal,
                        });
                    } else {
                        response = await fetchOk(withQuery(this.url, params), { signal: requestSignal });
                    }
                    break;
                } catch (err) {
                    // 中断・期限切れは再試行しない（fetchはsignalのreasonで失敗する）
                    // 使い回した接続が切れていたときは、ソケットのエラー（ECONNRESET）か undici のエラーになる
                    const code = networkErrorCode(err);
                    const reset = code === 'ECONNRESET' || code === 'UND_ERR_SOCKET';
                    if (reset && attempt < maxRetries && !requestSignal.aborted) {
                        logger.warn(`${code}発生。リトライします (${attempt}/${maxRetries})`);
                        continue;
                    }
                    throw err;
                }
            }
        } finally {
            clearTimeout(timer);
        }

        const sampleRate = parseInt(response.headers.get('ebyroid-pcm-sample-rate'), 10);
        const bitDepth = parseInt(response.headers.get('ebyroid-pcm-bit-depth'), 10);
        const numChannels = parseInt(response.headers.get('ebyroid-pcm-number-of-channels'), 10);

        let channelTransform;
        if (numChannels == 1) {
            // 元データがモノラルのとき
            channelTransform = new transforms.Mono2StereoConverter();
        } else {
            // 元データがステレオのとき
            channelTransform = new transforms.StereoByteAdjuster();
        }

        // TODO リサンプル処理をEbyroidに移行
        const resample = new transforms.SampleRateConverter({
            type: transforms.SampleRateConverter.SRC_SINC_MEDIUM_QUALITY,
            channels: 2,
            fromRate: sampleRate,
            fromDepth: bitDepth,
            toRate: 48000,
        });
        // Propagate HTTP/transform failures and preserve backpressure across
        // the complete response -> channel conversion -> resampling pipeline.
        // Destroying the composed stream also destroys the HTTP response.
        return Promise.resolve(
            composeStreams(
                Readable.fromWeb(response.body),
                new transforms.StallGuard(BODY_STALL_TIMEOUT_MS),
                channelTransform,
                resample
            )
        );
    }
}

// IVoiceroidStreamRepoの実装として登録
IVoiceroidStreamRepo.comprise(EbyroidStreamApiAdapter, [AppSettings]);

module.exports = EbyroidStreamApiAdapter;

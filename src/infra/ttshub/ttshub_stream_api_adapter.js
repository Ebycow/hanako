const axios = require('axios').default;
const transforms = require('../../library/transforms');
const AppSettings = require('../../core/app_settings');
const IVoiceroidStreamRepo = require('../../domain/repo/i_voiceroid_stream_repo');
const log4js = require('log4js');
const { compose } = require('stream');
const { randomUUID } = require('crypto');

const logger = log4js.getLogger(require('path').basename(__filename));
// 読み上げの音声が始まるまでに待てる時間。これ以上待たせると読み上げとして使い物にならない。
// ttshub に渡し、ttshub はこの中で（間に合わなければ代わりの声で）音声を返し始めるか、あきらめてエラーを返す
const DEADLINE_MS = 8000;
// 応答が始まるまでの上限。期限は ttshub が守るので、ここは ttshub が応答しなくなったときの備えとして少し長くする
const RESPONSE_TIMEOUT_MS = DEADLINE_MS + 2000;
// 応答が始まった後、読み手が待っているのにPCMが届かない時間の上限
const BODY_STALL_TIMEOUT_MS = 10000;
// Discordに送る形式。ttshub がこの形式に変換して返す
const OUTPUT_FORMAT = { codec: 'pcm_s16le', sample_rate: 48000, channels: 2 };

/**
 * RFC 8187 形式（UTF-8''<パーセントエンコード>）のヘッダ値を読む
 *
 * @param {string|undefined} value
 * @returns {string|undefined}
 */
function decodeExtValue(value) {
    if (typeof value !== 'string') return undefined;
    const encoded = value.startsWith("UTF-8''") ? value.slice(7) : value;
    try {
        return decodeURIComponent(encoded);
    } catch {
        return encoded;
    }
}

/** @typedef {import('stream').Readable} Readable */
/** @typedef {import('../../domain/entity/audios/voiceroid_audio')} VoiceroidAudio */

/**
 * ttshub（TTS ゲートウェイ）の音声合成APIアダプタ
 *
 * 話者の指定（`default`、`voicevox:ずんだもん/あまあま?speed=1.2` など）は解釈せずにそのまま渡す。
 * 知らない話者やエンジンの停止は ttshub が代わりの声で読んで吸収する。
 *
 * @implements {IVoiceroidStreamRepo}
 */
class TtshubStreamApiAdapter {
    /**
     * DIコンテナ用コンストラクタ
     *
     * @param {AppSettings} appSettings DI
     */
    constructor(appSettings) {
        this.url = appSettings.ttshubUrl.replace(/\/+$/, '') + '/v1/speech';
    }

    /**
     * (impl) IVoiceroidStreamRepo
     *
     * @param {VoiceroidAudio} audio
     * @param {AbortSignal} [signal] 中断の合図。応答の受信中に中断されてもレスポンスを破棄する
     * @returns {Promise<Readable>}
     */
    async getVoiceroidStream(audio, signal) {
        const body = { text: audio.content, voice: audio.speaker, format: OUTPUT_FORMAT, deadline_ms: DEADLINE_MS };
        // ttshub のログと突き合わせるための ID。ttshub はこの ID で受付から終了までを記録する
        // 本文はログに書かない（文字数だけ）
        const id = randomUUID();
        const started = Date.now();
        const describe = () =>
            `id=${id}, 文字数=${Array.from(audio.content).length}, 声=${audio.speaker}, 経過=${Date.now() - started}ms`;

        // 応答が始まるまでの期限。応答を受け取ったら解除する
        const responseTimeout = new AbortController();
        const timer = setTimeout(
            () => responseTimeout.abort(new Error(`ttshubの応答が${RESPONSE_TIMEOUT_MS}ms以内に始まらなかった`)),
            RESPONSE_TIMEOUT_MS
        );
        const requestSignal = signal ? AbortSignal.any([signal, responseTimeout.signal]) : responseTimeout.signal;

        let response;
        try {
            response = await axios.post(this.url, body, {
                responseType: 'stream',
                headers: { 'Content-Type': 'application/json', 'X-Request-Id': id },
                signal: requestSignal,
            });
        } catch (err) {
            if (responseTimeout.signal.aborted) {
                logger.warn(`ttshubの応答が始まらなかった (${describe()}): ${responseTimeout.signal.reason.message}`);
            } else if (signal && signal.aborted) {
                // スキップや退出で読み上げをやめただけ
                logger.debug(`ttshubへの合成を中断した (${describe()})`);
            } else {
                // AxiosError の message や code には本文は含まれない（本文は送ったデータの側にある）
                const reason = err.response ? `HTTP ${err.response.status}` : err.code || err.message;
                logger.warn(`ttshubで合成できなかった (${describe()}): ${reason}`);
            }
            throw err;
        } finally {
            clearTimeout(timer);
        }

        const sampleRate = parseInt(response.headers['x-tts-pcm-sample-rate'], 10);
        const channels = parseInt(response.headers['x-tts-pcm-channels'], 10);
        if (sampleRate !== OUTPUT_FORMAT.sample_rate || channels !== OUTPUT_FORMAT.channels) {
            response.data.destroy();
            throw new Error(`ttshubが要求と違う形式を返した (${sampleRate}Hz ${channels}ch, id=${id})`);
        }

        const fallback = response.headers['x-tts-fallback'];
        if (fallback && fallback !== 'none') {
            const resolved = decodeExtValue(response.headers['x-tts-resolved-voice']);
            logger.warn(
                `ttshubが代わりの声で読んだ (要求=${audio.speaker}, 実際=${resolved}, 理由=${fallback}, id=${id})`
            );
        }
        const warning = response.headers['x-tts-warning'];
        if (warning) {
            logger.info(`ttshubからの警告: ${warning} (id=${id})`);
        }

        // ttshub が Discord 向けの形式に変換済みなので、ここでは届かなくなったときの監視だけ行う
        const stream = compose(response.data, new transforms.StallGuard(BODY_STALL_TIMEOUT_MS));
        stream.on('error', (err) => {
            // 読み上げをやめて破棄したときのエラーは記録しない
            if ((signal && signal.aborted) || err.name === 'AbortError') return;
            logger.warn(`ttshubからの音声が途中で途切れた (${describe()}): ${err.message}`);
        });
        return stream;
    }
}

// IVoiceroidStreamRepoの実装として登録
IVoiceroidStreamRepo.comprise(TtshubStreamApiAdapter, [AppSettings]);

module.exports = TtshubStreamApiAdapter;
module.exports.decodeExtValue = decodeExtValue;

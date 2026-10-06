const axios = require('axios').default;
const transforms = require('../../library/transforms');
const AppSettings = require('../../core/app_settings');
const IVoiceroidStreamRepo = require('../../domain/repo/i_voiceroid_stream_repo');
const log4js = require('log4js');
const { compose } = require('stream');

const logger = log4js.getLogger(require('path').basename(__filename));
// 応答が始まるまでの上限。ttshub はエンジンごとの上限で先に打ち切り、代わりの声で読むため、それより少し長くする。
// VOICEVOX は音声を一括で返すため、長文だと応答開始まで時間がかかる
const RESPONSE_TIMEOUT_MS = 30000;
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
        const body = { text: audio.content, voice: audio.speaker, format: OUTPUT_FORMAT };

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
                headers: { 'Content-Type': 'application/json' },
                signal: requestSignal,
            });
        } finally {
            clearTimeout(timer);
        }

        const sampleRate = parseInt(response.headers['x-tts-pcm-sample-rate'], 10);
        const channels = parseInt(response.headers['x-tts-pcm-channels'], 10);
        if (sampleRate !== OUTPUT_FORMAT.sample_rate || channels !== OUTPUT_FORMAT.channels) {
            response.data.destroy();
            throw new Error(`ttshubが要求と違う形式を返した (${sampleRate}Hz ${channels}ch)`);
        }

        const fallback = response.headers['x-tts-fallback'];
        if (fallback && fallback !== 'none') {
            const resolved = decodeExtValue(response.headers['x-tts-resolved-voice']);
            logger.warn(`ttshubが代わりの声で読んだ (要求=${audio.speaker}, 実際=${resolved}, 理由=${fallback})`);
        }
        const warning = response.headers['x-tts-warning'];
        if (warning) {
            logger.info(`ttshubからの警告: ${warning}`);
        }

        // ttshub が Discord 向けの形式に変換済みなので、ここでは届かなくなったときの監視だけ行う
        return compose(response.data, new transforms.StallGuard(BODY_STALL_TIMEOUT_MS));
    }
}

// IVoiceroidStreamRepoの実装として登録
IVoiceroidStreamRepo.comprise(TtshubStreamApiAdapter, [AppSettings]);

module.exports = TtshubStreamApiAdapter;
module.exports.decodeExtValue = decodeExtValue;

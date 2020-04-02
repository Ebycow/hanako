const axios = require('axios').default;
const SampleRate = require('node-libsamplerate');
const transforms = require('../../library/transforms');
const AppSettings = require('../../core/app_settings');
const IVoiceroidStreamRepo = require('../../domain/repo/i_voiceroid_stream_repo');

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
    }

    /**
     * (impl) IVoiceroidStreamRepo
     *
     * @param {VoiceroidAudio} audio
     * @returns {Promise<Readable>}
     */
    async getVoiceroidStream(audio) {
        const response = await axios.get(this.url, { responseType: 'stream', params: { text: audio.content } });

        const sampleRate = parseInt(response.headers['ebyroid-pcm-sample-rate'], 10);
        const bitDepth = parseInt(response.headers['ebyroid-pcm-bit-depth'], 10);
        const numChannels = parseInt(response.headers['ebyroid-pcm-number-of-channels'], 10);

        let stream = response.data;
        if (numChannels == 1) {
            // 元データがモノラルのとき
            stream = stream.pipe(new transforms.Mono2StereoConverter());
        } else {
            // 元データがステレオのとき
            stream = stream.pipe(new transforms.StereoByteAdjuster());
        }

        // TODO リサンプル処理をEbyroidに移行
        const resample = new SampleRate({
            type: SampleRate.SRC_SINC_MEDIUM_QUALITY,
            channels: 2,
            fromRate: sampleRate,
            fromDepth: bitDepth,
            toRate: 48000,
            toDepth: 16,
        });
        stream = stream.pipe(resample);
        return Promise.resolve(stream);
    }
}

// IVoiceroidStreamRepoの実装として登録
IVoiceroidStreamRepo.comprise(EbyroidStreamApiAdapter, [AppSettings]);

module.exports = EbyroidStreamApiAdapter;

const axios = require('axios').default;
const SampleRate = require('node-libsamplerate');
const transforms = require('../../core/transforms');
const IVoiceroidStreamRepo = require('../../domain/repos/i_voiceroid_stream_repo');

/** @typedef {import('stream').Readable} Readable */

class EbyroidStreamApiAdapter {
    constructor() {
        // TODO コンフィグDI
        this.url = 'http://localhost:4090/api/v1/audiostream';
    }

    async getStream(audio) {
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
        return stream;
    }
}

IVoiceroidStreamRepo.comprise(EbyroidStreamApiAdapter);

module.exports = EbyroidStreamApiAdapter;

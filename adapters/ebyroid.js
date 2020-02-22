const { Readable } = require('stream');
const axios = require('axios').default;
const SampleRate = require('node-libsamplerate');
const { Interleaver } = require('../transforms/interleaver');
const { StereoByteAdjuster } = require('../transforms/byteadjuster');
const { EbyroidRequest } = require('../models/audiorequest');

class EbyroidAdapter {

    constructor(baseUrl) {
        this.baseUrl = baseUrl;
        console.log(baseUrl);
    }

    /**
     * @param {EbyroidRequest} request
     * @returns {Promise<Readable>}
     */
    async requestAudioStream(request) {
        let response;

        try {
            response = await axios.get(this.baseUrl, {
                responseType: 'stream',
                params : { text: request.text }
            });
        } catch (err) {
            console.error(err);
            return // TODO: 例外処理どうする？
        }

        const sampleRate = parseInt(response.headers['ebyroid-pcm-sample-rate'], 10);
        const bitDepth = parseInt(response.headers['ebyroid-pcm-bit-depth'], 10);
        const numChannels = parseInt(response.headers['ebyroid-pcm-number-of-channels'], 10);

        let stream = response.data;
        if (numChannels == 1) {
            // 元データがモノラルのとき
            stream = stream.pipe(new Interleaver());
        } else {
            // 元データがステレオのとき
            stream = stream.pipe(new StereoByteAdjuster());
        }

        // # SE流す時はこう
        //
        // const sampleRate = 44100;
        // const bitDepth = 16;
        // stream = fs.createReadStream('syamu.wav').pipe(new WaveFileHeaderTrimmer).pipe(new StereoByteAdjuster);

        const resample = new SampleRate({
            type: SampleRate.SRC_SINC_MEDIUM_QUALITY,
            channels: 2,
            fromRate: sampleRate,
            fromDepth: bitDepth,
            toRate: 48000,
            toDepth: 16
        });
        stream = stream.pipe(resample);
        return stream;
    }

}

module.exports = {
    EbyroidAdapter
};

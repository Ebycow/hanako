const { Readable } = require('stream');
const axios = require('axios').default;
const SampleRate = require('node-libsamplerate');
const { Interleaver } = require('../transforms/interleaver');
const { StereoByteAdjuster } = require('../transforms/byteadjuster');
const { EbyroidRequest } = require('../models/audiorequest');
const { AudioStreamAdapter } = require('./interfaces');

/**
 * Ebyroidから音声ストリームを取得するアダプタ
 */
class EbyroidAdapter extends AudioStreamAdapter {

    /**
     * @param {string} baseUrl 
     */
    constructor(baseUrl) {
        super();
        
        /**
         * @type {string}
         * @private
         */
        this.baseUrl = baseUrl;
    }

    /**
     * @param {EbyroidRequest} request
     * @returns {Promise<Readable>}
     * @override
     */
    async requestAudioStream(request) {
        const response = await axios.get(this.baseUrl, { responseType: 'stream', params : { text: request.text } });

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

        // TODO リサンプル処理をEbyroidに移行
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

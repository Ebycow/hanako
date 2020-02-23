const fs = require('fs');
const { Readable } = require('stream');
const axios = require('axios').default;
const SampleRate = require('node-libsamplerate');
const { WaveFileHeaderTrimmer } = require('../transforms/waveheader');
const { StereoByteAdjuster } = require('../transforms/byteadjuster');
const { SoundRequest } = require('../models/audiorequest');

class SoundAdapter {

    constructor() {
        // TODO 現在はモック実装
    }

    /**
     * @param {SoundRequest} request
     * @returns {Promise<Readable>}
     */
    requestAudioStream(request) {
        // TODO 現在はモック実装
        const sampleRate = 44100;
        const bitDepth = 16;
        let stream;
        try {
            stream = fs.createReadStream(request.resource)
                .pipe(new WaveFileHeaderTrimmer)
                .pipe(new StereoByteAdjuster);
        } catch (err) {
            return Promise.reject(err);
        }
        
        const resample = new SampleRate({
            type: SampleRate.SRC_SINC_MEDIUM_QUALITY,
            channels: 2,
            fromRate: 44100,
            fromDepth: 16,
            toRate: 48000,
            toDepth: 16
        });
        stream = stream.pipe(resample);
        return Promise.resolve(stream);
    }

}

module.exports = {
    SoundAdapter
};

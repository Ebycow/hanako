const { Readable } = require('stream');
const { StereoByteAdjuster } = require('../transforms/byteadjuster');
const { SoundRequest } = require('../models/audiorequest');
const { FileAdapterManager } = require('./fileadapter');

class SoundAdapter {

    constructor() {
        // TODO
    }

    /**
     * @param {SoundRequest} request
     * @returns {Promise<Readable>}
     */
    async requestAudioStream(request) {
        let stream;
        try {
            stream = await FileAdapterManager.readSoundFile(request.segment, request.resource);
        } catch (err) {
            throw err; // TODO
        }
        
        return stream.pipe(new StereoByteAdjuster());
    }

}

module.exports = {
    SoundAdapter
};

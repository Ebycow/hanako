const { Readable } = require('stream');
const { StereoByteAdjuster } = require('../transforms/byteadjuster');
const { SoundRequest } = require('../models/audiorequest');
const { FileAdapterManager, FileAdapterErrors } = require('./fileadapter');
const { AudioStreamAdapter } = require('./interfaces');

/**
 * ファイルからSE音声ストリームを取得するアダプタ
 */
class SoundAdapter extends AudioStreamAdapter {
    constructor() {
        super();
    }

    /**
     * @param {SoundRequest} request
     * @returns {Promise<Readable>}
     * @throws {FileAdapterErrors.NOT_FOUND}
     * @override
     */
    async requestAudioStream(request) {
        const stream = await FileAdapterManager.readSoundFile(request.segment, request.resource);
        return stream.pipe(new StereoByteAdjuster());
    }
}

module.exports = {
    SoundAdapter,
};

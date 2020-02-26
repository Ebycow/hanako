const { Readable } = require('stream');
const { NoopRequest } = require('../models/audiorequest');
const { AudioStreamAdapter } = require('./interfaces');

class NoopReadable extends Readable {
    constructor(options) {
        super(options);
    }

    _read() {
        this.push(null);
    }
}

/**
 * No Operation アダプタ
 */
class NoopAdapter extends AudioStreamAdapter {
    constructor() {
        super();
    }

    /**
     * @param {NoopRequest} request
     * @returns {Promise<Readable>}
     * @override
     */
    requestAudioStream(request) {
        return Promise.resolve(new NoopReadable());
    }
}

module.exports = {
    NoopAdapter,
};

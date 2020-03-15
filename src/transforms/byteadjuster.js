const path = require('path');
const logger = require('log4js').getLogger(path.basename(__filename));
const { Transform } = require('stream');

class StereoByteAdjuster extends Transform {
    constructor(options) {
        super(Object.assign({}, options, { objectMode: false }));
        this.fragments = [];
    }

    _transform(_buffer, _, done) {
        let buffer = _buffer;
        if (this.fragments.length > 0) {
            const uint8array = new Uint8Array(this.fragments);
            this.fragments = [];
            const newbuffer = Buffer.concat([uint8array, buffer], uint8array.length + buffer.length);
            buffer = newbuffer;
        }

        const numFragments = buffer.byteLength & 3;

        if (numFragments > 0) {
            const baseOffset = buffer.byteLength - numFragments;
            for (let i = 0; i < numFragments; i++) {
                const uint8value = buffer.readUInt8(baseOffset + i);
                this.fragments.push(uint8value);
            }
            buffer = buffer.subarray(0, -numFragments);
        }

        logger.trace(`adjust: passing ${buffer.byteLength} bytes ...`);
        this.push(buffer);
        done();
    }
}

module.exports = {
    StereoByteAdjuster,
};

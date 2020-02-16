const Transform = require('stream').Transform;

class Interleaver extends Transform {

    constructor() {
        super();
        this.fragments = [];

    }

    _transform(_buffer, _, done) {
        let buffer = _buffer;
        if (this.fragments.length > 0) {
            const uint8value = this.fragments.pop();
            const uint8array = new Uint8Array([uint8value]);
            const newbuffer = Buffer.concat([uint8array, buffer], uint8array.length + buffer.length);
            buffer = newbuffer
        }

        const hasFragment = !!(buffer.byteLength & 1);
        const byteSize = hasFragment ? buffer.byteLength - 1 : buffer.byteLength;
        const size = (byteSize / 2) | 0;
        console.debug(`wave: processing ${byteSize} bytes ...`);

        const src = new Int16Array(size);
        for (let i = 0; i < size; i++) {
            const offset = i * 2;
            src[i] = buffer.readInt16LE(offset);
        }
        if (hasFragment) {
            const uint8value = buffer.readUInt8(buffer.byteLength - 1);
            this.fragments.push(uint8value);
        }

        const dest = new Int16Array(size * 2);
        for (let i = 0; i < size; i++) {
            const offset = i * 2;
            dest[offset] = src[i];
            dest[offset + 1] = src[i];
        }

        const result = Buffer.from(dest.buffer);
        this.push(result);
        done();

    }

}

module.exports = {
    Interleaver,
};

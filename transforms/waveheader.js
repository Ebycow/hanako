const { Transform } = require('stream');

const DATA_CHUNK = new Uint8Array([0x64, 0x61, 0x74, 0x61]);

class WaveFileHeaderTrimmer extends Transform {

    constructor(options) {
        super(Object.assign({}, options, { objectMode: false }));
        this.alreadyTrimmed = false;

    }


    _transform(buffer, _, done) {
        if (this.alreadyTrimmed) {
            done(null, buffer);
            return;

        }

        const index = buffer.indexOf(DATA_CHUNK);

        if (index > 0) {
            const offset = index + 8;
            const skipped = buffer.subarray(offset);
            this.alreadyTrimmed = true;
            console.debug(`trimmer: skipped ${offset} bytes`);
            done(null, skipped);

        } else {
            done(null, buffer);

        }
    
    }

}

module.exports = {
    WaveFileHeaderTrimmer,
}

const assert = require('assert').strict;

const RequestType = {
    EBYROID: 'ebyroid',
    SOUND: 'sound'
};

class AudioRequest {

    constructor(options) {
        assert(typeof options.type === 'string');
        assert(typeof options.resource === 'string' || typeof options.text === 'string');
        
        this.type = options.type;

        this.text = (typeof options.text !== 'undefined') ? options.text : null;

        this.resource = (typeof options.resource !== 'undefined') ? options.resource : null;

        this.options = (typeof options.options === 'object') ? options.options : null;
    }

}

class EbyroidRequest extends AudioRequest {

    constructor(text) {
        super({ type: RequestType.EBYROID, text });
    }

}

class SoundRequest extends AudioRequest {

    constructor(segment, resource) {
        super({ type: RequestType.SOUND, resource });
        this.segment = segment;
    }

}

module.exports = {
    RequestType, AudioRequest, EbyroidRequest, SoundRequest
};

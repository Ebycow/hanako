const assert = require('assert').strict;
const { Readable } = require('stream');
const CombinedStream = require('combined-stream2');
const { AudioRequest } = require('../models/audiorequest');
const { EbyroidAdapter } = require('./ebyroid');

function cs2reducer(cs2, stream) {
    cs2.append(stream);
    return cs2;
}

class AudioAdapter {

    constructor(adapters) {
        this.adapters = new Map();
        this.adapters.set('ebyroid', adapters.ebyroid || null);
        this.adapters.set('sound', adapters.sound || null);
        
        const instances = Array.from(this.adapters.values());
        if (instances.every(x => x === null)) {
            throw new Error('読み上げには最低でもひとつのオーディオソースが必要です。');
        }
    }

    /**
     * @param {AudioRequest[]} requests
     * @returns {Promise<Readable>}
     */
    acceptAudioRequests(requests) {
        assert(requests.length > 0);
        const promises = requests.map(r => this.adapters.get(r.type).requestAudioStream(r));
        return Promise.all(promises).then(streams => streams.reduce(cs2reducer, CombinedStream.create()));
    }

}

class AudioAdapterManager {
    
    static adapter;

    static init(options) {
        // TODO 使用設定とかいろいろ
        const ebyroid = new EbyroidAdapter(options.ebyroid.baseUrl);
        this.adapter = new AudioAdapter({ ebyroid });
    }

    /**
     * @param  {...AudioRequest} reqs
     * @returns {Promise<Readable>}
     */
    static request(...reqs) {
        return this.adapter.acceptAudioRequests(reqs);
    }

}

module.exports = {
    AudioAdapterManager
};

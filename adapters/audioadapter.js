const assert = require('assert').strict;
const { Readable } = require('stream');
const CombinedStream = require('combined-stream2');
const { AudioRequest } = require('../models/audiorequest');
const { EbyroidAdapter } = require('./ebyroid');
const { SoundAdapter } = require('./sound');

function cs2reducer(cs2, stream) {
    cs2.append(stream);
    return cs2;
}

// TODO 並列複数Hz問題が解決したらいらなくなる処理
const sconv_size = 4 * 0xFF;
function sconv(streams) {
    const arr = [];
    const len = streams.length * 2 - 1;
    for (let i = 0; i < len; i++) {
        if (!(i & 1)) {
            arr[i] = streams.shift();
        } else {
            arr[i] = Readable.from(Buffer.alloc(sconv_size), { objectMode: false });
        }
    }
    return arr;
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
        return Promise.all(promises).then(streams => sconv(streams).reduce(cs2reducer, CombinedStream.create()));
    }

}

class AudioAdapterManager {
    
    static adapter;

    static init(options) {
        // TODO 使用設定とかいろいろ
        const ebyroid = new EbyroidAdapter(options.ebyroid.baseUrl);
        const sound = new SoundAdapter();
        this.adapter = new AudioAdapter({ ebyroid, sound });
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

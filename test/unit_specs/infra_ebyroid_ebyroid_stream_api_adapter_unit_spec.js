const { Readable, Transform } = require('stream');
const { expect } = require('chai');
const proxyquire = require('proxyquire');
const sinon = require('sinon');

class PassThroughSampleRate extends Transform {
    _transform(chunk, _encoding, callback) {
        this.push(chunk);
        callback();
    }
}
PassThroughSampleRate.SRC_SINC_MEDIUM_QUALITY = 1;

function response() {
    return {
        headers: {
            'ebyroid-pcm-sample-rate': '48000',
            'ebyroid-pcm-bit-depth': '16',
            'ebyroid-pcm-number-of-channels': '2',
        },
        data: Readable.from([Buffer.from([1, 2, 3, 4])]),
    };
}

async function consume(stream) {
    const chunks = [];
    for await (const chunk of stream) chunks.push(chunk);
    return Buffer.concat(chunks);
}

describe('EbyroidStreamApiAdapter', () => {
    let axios;
    let EbyroidStreamApiAdapter;

    beforeEach(() => {
        axios = {
            get: sinon.stub().resolves(response()),
            post: sinon.stub().resolves(response()),
        };
        EbyroidStreamApiAdapter = proxyquire.noPreserveCache().noCallThru()(
            '../../src/infra/ebyroid/ebyroid_stream_api_adapter',
            {
                axios: { default: axios },
                'node-libsamplerate': PassThroughSampleRate,
            }
        );
    });

    afterEach(() => sinon.restore());

    it('uses POST JSON for the v2 streaming URL without putting speech in the URL', async () => {
        const url = 'http://localhost:4090/api/v2/audiostream';
        const adapter = new EbyroidStreamApiAdapter({
            ebyroidStreamApiUrl: url,
            ebyroidStreamApiMode: 'auto',
        });

        const stream = await adapter.getVoiceroidStream({
            content: 'secret speech',
            speaker: 'aoi',
        });
        expect(await consume(stream)).to.deep.equal(Buffer.from([1, 2, 3, 4]));
        sinon.assert.notCalled(axios.get);
        sinon.assert.calledOnce(axios.post);
        expect(axios.post.firstCall.args[0]).to.equal(url);
        expect(axios.post.firstCall.args[1]).to.deep.equal({
            text: 'secret speech',
            name: 'aoi',
        });
        expect(axios.post.firstCall.args[2].responseType).to.equal('stream');
        expect(axios.post.firstCall.args[0]).not.to.include('secret speech');
    });

    it('keeps the legacy GET transport for a v1 URL in auto mode', async () => {
        const url = 'http://localhost:4090/api/v1/audiostream';
        const adapter = new EbyroidStreamApiAdapter({
            ebyroidStreamApiUrl: url,
            ebyroidStreamApiMode: 'auto',
        });

        await consume(
            await adapter.getVoiceroidStream({
                content: 'legacy',
                speaker: 'default',
            })
        );
        sinon.assert.notCalled(axios.post);
        sinon.assert.calledOnceWithMatch(axios.get, url, {
            responseType: 'stream',
            params: { text: 'legacy' },
        });
    });

    it('allows the configured mode to override URL detection', async () => {
        const adapter = new EbyroidStreamApiAdapter({
            ebyroidStreamApiUrl: 'http://localhost:4090/custom',
            ebyroidStreamApiMode: 'streaming-post',
        });

        await consume(
            await adapter.getVoiceroidStream({
                content: 'forced',
                speaker: 'default',
            })
        );
        sinon.assert.calledOnce(axios.post);
        sinon.assert.notCalled(axios.get);
    });
});

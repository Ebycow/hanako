const { Readable } = require('stream');
const { expect } = require('chai');
const proxyquire = require('proxyquire');
const sinon = require('sinon');

function response(body = Readable.from([Buffer.from([1, 2, 3, 4])])) {
    return new Response(Readable.toWeb(body), {
        headers: {
            'ebyroid-pcm-sample-rate': '48000',
            'ebyroid-pcm-bit-depth': '16',
            'ebyroid-pcm-number-of-channels': '2',
        },
    });
}

/** fetch がソケットのエラーを包んで投げる TypeError('fetch failed') */
function connectionReset(code) {
    return new TypeError('fetch failed', { cause: Object.assign(new Error('other side closed'), { code }) });
}

async function consume(stream) {
    const chunks = [];
    for await (const chunk of stream) chunks.push(chunk);
    return Buffer.concat(chunks);
}

/** fetch stub that only settles when its signal aborts, like a request stuck in Ebyroid's queue */
function hangUntilAborted(_url, init) {
    return new Promise((_resolve, reject) => {
        init.signal.addEventListener('abort', () => reject(init.signal.reason));
    });
}

describe('EbyroidStreamApiAdapter', () => {
    let fetchOk;
    let EbyroidStreamApiAdapter;

    beforeEach(() => {
        fetchOk = sinon.stub().callsFake(async () => response());
        EbyroidStreamApiAdapter = proxyquire.noPreserveCache().noCallThru()(
            '../../src/infra/ebyroid/ebyroid_stream_api_adapter',
            {
                '../http/fetch_ok': { fetchOk, '@noCallThru': false },
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
        sinon.assert.calledOnce(fetchOk);
        const [requestUrl, init] = fetchOk.firstCall.args;
        expect(init.method).to.equal('POST');
        expect(String(requestUrl)).to.equal(url);
        expect(JSON.parse(init.body)).to.deep.equal({
            text: 'secret speech',
            name: 'aoi',
        });
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
        sinon.assert.calledOnce(fetchOk);
        const [requestUrl, init] = fetchOk.firstCall.args;
        expect(init.method).to.equal(undefined);
        expect(String(requestUrl)).to.equal(`${url}?text=legacy`);
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
        sinon.assert.calledOnce(fetchOk);
        expect(fetchOk.firstCall.args[1].method).to.equal('POST');
    });

    describe('cancellation', () => {
        const url = 'http://localhost:4090/api/v2/audiostream';

        it('stops waiting for the response when the caller aborts', async () => {
            fetchOk.callsFake(hangUntilAborted);
            const adapter = new EbyroidStreamApiAdapter({ ebyroidStreamApiUrl: url });
            const controller = new AbortController();

            const result = adapter
                .getVoiceroidStream({ content: 'cancelled', speaker: 'default' }, controller.signal)
                .catch((err) => err);
            controller.abort();

            expect((await result).name).to.equal('AbortError');
            expect(fetchOk.firstCall.args[1].signal.aborted).to.equal(true);
        });

        it('does not retry ECONNRESET once the request has been aborted', async () => {
            const controller = new AbortController();
            fetchOk.callsFake(async () => {
                controller.abort();
                throw connectionReset('ECONNRESET');
            });
            const adapter = new EbyroidStreamApiAdapter({ ebyroidStreamApiUrl: url });

            await adapter.getVoiceroidStream({ content: 'x', speaker: 'default' }, controller.signal).catch(() => {});

            sinon.assert.calledOnce(fetchOk);
        });

        ['ECONNRESET', 'UND_ERR_SOCKET'].forEach((code) => {
            it(`retries when a reused connection fails with ${code}`, async () => {
                fetchOk.onFirstCall().rejects(connectionReset(code));
                const adapter = new EbyroidStreamApiAdapter({ ebyroidStreamApiUrl: url });

                await consume(await adapter.getVoiceroidStream({ content: 'x', speaker: 'default' }));

                sinon.assert.calledTwice(fetchOk);
            });
        });
    });

    describe('timeouts', () => {
        const url = 'http://localhost:4090/api/v2/audiostream';
        let clock;

        beforeEach(() => {
            // setImmediate は本物のままにする（fetch の本文の破棄が setImmediate を使う）
            clock = sinon.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'Date'] });
        });

        afterEach(() => {
            clock.restore();
        });

        it('gives up when the response does not start within 15 seconds', async () => {
            fetchOk.callsFake(hangUntilAborted);
            const adapter = new EbyroidStreamApiAdapter({ ebyroidStreamApiUrl: url });

            const result = adapter.getVoiceroidStream({ content: 'slow', speaker: 'default' }).catch((err) => err);
            await clock.tickAsync(14999);
            sinon.assert.calledOnce(fetchOk);
            await clock.tickAsync(1);

            expect((await result).message).to.include('15000ms');
        });

        it('keeps the response alive after the response deadline once the response has started', async () => {
            const adapter = new EbyroidStreamApiAdapter({ ebyroidStreamApiUrl: url });

            await adapter.getVoiceroidStream({ content: 'ok', speaker: 'default' });
            await clock.tickAsync(20000);

            expect(fetchOk.firstCall.args[1].signal.aborted).to.equal(false);
        });

        it('destroys the HTTP response when PCM stops arriving while it is being read', async () => {
            const body = new Readable({ read() {} });
            fetchOk.resolves(response(body));
            const adapter = new EbyroidStreamApiAdapter({ ebyroidStreamApiUrl: url });

            const stream = await adapter.getVoiceroidStream({ content: 'stalled', speaker: 'default' });
            const failed = new Promise((resolve) => stream.once('error', resolve));
            stream.resume();
            await clock.tickAsync(10000);

            expect((await failed).message).to.include('10000ms');
            expect(body.destroyed).to.equal(true);
        });
    });
});

require('chai').should();
const http = require('http');
const sinon = require('sinon');
const TtshubVoiceCatalogAdapter = require('../../src/infra/ttshub/ttshub_voice_catalog_adapter');
const PassthroughVoiceCatalog = require('../../src/infra/passthrough/passthrough_voice_catalog');

/************************************************************************
 * TtshubVoiceCatalogAdapterクラス単体スペック
 *
 * 期待動作：ttshub の話者一覧・あいまい照合を VoiceInfo にして返す
 * 備考：ttshub の代わりにローカルのHTTPサーバを立てる
 ***********************************************************************/

describe('TtshubVoiceCatalogAdapter', () => {
    let server;
    let port;
    let requests;
    let routes;

    beforeEach(async () => {
        requests = [];
        routes = {};
        server = http.createServer((req, res) => {
            const url = new URL(req.url, 'http://localhost');
            requests.push({ path: url.pathname, query: Object.fromEntries(url.searchParams) });
            const route = routes[url.pathname];
            if (!route) {
                res.writeHead(404).end();
                return;
            }
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify(route(url.searchParams)));
        });
        await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
        port = server.address().port;
    });

    afterEach(async () => {
        await new Promise((resolve) => server.close(resolve));
    });

    const adapter = () => new TtshubVoiceCatalogAdapter({ ttshubUrl: `http://127.0.0.1:${port}/` });

    describe('#searchVoices', () => {
        specify('話者・別名・プリセットを VoiceInfo にする', async () => {
            routes['/v1/voices'] = () => ({
                voices: [
                    {
                        address: 'voicevox:ずんだもん/ノーマル',
                        engine: 'voicevox',
                        display_name: 'ずんだもん（ノーマル）',
                        credit: 'VOICEVOX:ずんだもん',
                        terms_url: 'https://zunko.jp/con_ongen_kiyaku.html',
                        available: true,
                    },
                    { address: 'preset:早口ずんだもん', engine: 'preset', display_name: 'preset:早口ずんだもん' },
                ],
            });
            const voices = await adapter().searchVoices('ずんだ', 25);

            // 補完の候補には、エンジンが止まっている声を出さない
            requests[0].query.should.deep.equal({ q: 'ずんだ', limit: '25', available: 'true' });
            voices.should.deep.equal([
                {
                    address: 'voicevox:ずんだもん/ノーマル',
                    displayName: 'ずんだもん（ノーマル）',
                    engine: 'voicevox',
                    credit: 'VOICEVOX:ずんだもん',
                    termsUrl: 'https://zunko.jp/con_ongen_kiyaku.html',
                    character: null,
                    style: null,
                    available: true,
                },
                {
                    address: 'preset:早口ずんだもん',
                    displayName: 'preset:早口ずんだもん',
                    engine: null,
                    credit: null,
                    termsUrl: null,
                    character: null,
                    style: null,
                    available: true,
                },
            ]);
        });
    });

    describe('#loadVoiceCatalog', () => {
        const page1 = {
            voices: [
                {
                    address: 'voicevox:ずんだもん/ノーマル',
                    engine: 'voicevox',
                    character: 'ずんだもん',
                    style: 'ノーマル',
                    display_name: 'ずんだもん（ノーマル）',
                },
            ],
            next_cursor: '1',
        };
        const page2 = {
            voices: [{ address: 'zundamon', engine: 'alias', target: 'voicevox:ずんだもん' }],
            next_cursor: null,
        };

        specify('全ページを取得し、話者と別名・プリセットに分ける', async () => {
            routes['/v1/voices'] = (q) => (q.get('cursor') === '1' ? page2 : page1);
            const sub = adapter();
            await sub.loadVoiceCatalog();
            await sub.refreshing;
            const catalog = await sub.loadVoiceCatalog();

            catalog.available.should.be.true;
            catalog.voices
                .map((v) => [v.address, v.character, v.style])
                .should.deep.equal([['voicevox:ずんだもん/ノーマル', 'ずんだもん', 'ノーマル']]);
            catalog.named.should.deep.equal([{ name: 'zundamon', target: 'voicevox:ずんだもん' }]);
        });

        specify('一覧がまだなければ取得を待たずに取得できなかった一覧を返し、裏で取得を始める', async () => {
            routes['/v1/voices'] = (q) => (q.get('cursor') === '1' ? page2 : page1);
            const sub = adapter();
            (await sub.loadVoiceCatalog()).available.should.be.false;
            sub.refreshing.should.be.a('promise');
            await sub.refreshing;
            (await sub.loadVoiceCatalog()).available.should.be.true;
        });

        specify('取得した一覧を使い回し、古くなったら前回の一覧を返しながら裏で取り直す', async () => {
            routes['/v1/voices'] = (q) => (q.get('cursor') === '1' ? page2 : page1);
            const sub = adapter();
            const clock = sinon.useFakeTimers({ now: 0, toFake: ['Date'] });
            try {
                await sub.loadVoiceCatalog();
                await sub.refreshing;
                const first = await sub.loadVoiceCatalog();
                (await sub.loadVoiceCatalog()).should.equal(first);
                requests.length.should.equal(2);

                clock.tick(60000);
                (await sub.loadVoiceCatalog()).should.equal(first);
                await sub.refreshing;
                requests.length.should.equal(4);
                (await sub.loadVoiceCatalog()).should.not.equal(first);
            } finally {
                clock.restore();
            }
        });

        specify('取得できなければ失敗せず、取得できなかった一覧を返す', async () => {
            const unreachable = new TtshubVoiceCatalogAdapter({ ttshubUrl: 'http://127.0.0.1:1' });
            (await unreachable.loadVoiceCatalog()).available.should.be.false;
            await unreachable.refreshing.catch(() => {});
            (await unreachable.loadVoiceCatalog()).available.should.be.false;
        });
    });

    describe('#resolveVoice', () => {
        specify('照合した話者を返し、パラメータは照合に使わず付け直す', async () => {
            routes['/v1/voices/resolve'] = () => ({
                match: 'voicevox:ずんだもん/あまあま',
                voice: {
                    address: 'voicevox:ずんだもん/あまあま',
                    engine: 'voicevox',
                    display_name: 'ずんだもん（あまあま）',
                    credit: 'VOICEVOX:ずんだもん',
                },
                suggestions: [],
            });
            const { voice } = await adapter().resolveVoice('ずんだもん あまあま?speed=1.2');

            requests[0].query.q.should.equal('ずんだもん あまあま');
            voice.address.should.equal('voicevox:ずんだもん/あまあま?speed=1.2');
            voice.displayName.should.equal('ずんだもん（あまあま）');
            voice.credit.should.equal('VOICEVOX:ずんだもん');
        });

        specify('見つからなければ候補を返す', async () => {
            routes['/v1/voices/resolve'] = () => ({
                match: null,
                voice: null,
                suggestions: ['voicevox:四国めたん/ノーマル'],
            });
            const { voice, suggestions } = await adapter().resolveVoice('めたーん');

            (voice === null).should.be.true;
            suggestions.map((s) => s.address).should.deep.equal(['voicevox:四国めたん/ノーマル']);
        });

        specify('default は ttshub に問い合わせずに受け付ける', async () => {
            const { voice } = await adapter().resolveVoice('default');

            voice.address.should.equal('default');
            requests.length.should.equal(0);
        });

        specify('ttshub に届かなければ、利用者に伝わるエラーにする', async () => {
            await new Promise((resolve) => server.close(resolve));
            server = http.createServer();
            await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
            const unreachable = new TtshubVoiceCatalogAdapter({ ttshubUrl: 'http://127.0.0.1:1' });

            let error;
            try {
                await unreachable.resolveVoice('ずんだもん');
            } catch (e) {
                error = e;
            }
            error.eby.should.be.true;
            error.explained.should.be.true;
        });
    });
});

describe('PassthroughVoiceCatalog', () => {
    specify('候補は出さず、入力をそのまま話者として受け付ける', async () => {
        const catalog = new PassthroughVoiceCatalog();
        (await catalog.searchVoices('ずんだ', 25)).should.deep.equal([]);
        const { voice } = await catalog.resolveVoice(' kiritan ');
        voice.should.deep.equal({ address: 'kiritan', displayName: 'kiritan', engine: null, credit: null });
        (await catalog.loadVoiceCatalog()).available.should.be.false;
    });
});

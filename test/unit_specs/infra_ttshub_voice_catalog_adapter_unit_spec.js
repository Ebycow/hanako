require('chai').should();
const http = require('http');
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
        const zundamonJson = {
            address: 'voicevox:ずんだもん/ノーマル',
            kind: 'voice',
            engine: 'voicevox',
            display_name: 'ずんだもん（ノーマル）',
            credit: 'VOICEVOX:ずんだもん',
            terms_url: 'https://zunko.jp/con_ongen_kiyaku.html',
            available: true,
        };

        specify('話者・別名・プリセットを VoiceInfo にする', async () => {
            routes['/v1/voices'] = () => ({
                voices: [
                    zundamonJson,
                    {
                        address: 'preset:早口ずんだもん',
                        kind: 'preset',
                        engine: 'voicevox',
                        display_name: 'preset:早口ずんだもん',
                        target: 'voicevox:ずんだもん?speed=1.4',
                    },
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
                },
                {
                    address: 'preset:早口ずんだもん',
                    displayName: 'preset:早口ずんだもん',
                    engine: 'voicevox',
                    credit: null,
                    termsUrl: null,
                },
            ]);
        });

        specify('入力のパラメータは検索に使わず、候補の指定と表示名に付ける', async () => {
            routes['/v1/voices'] = () => ({ voices: [zundamonJson] });
            const [voice] = await adapter().searchVoices('ずんだ?speed=1.4', 25);

            requests[0].query.q.should.equal('ずんだ');
            voice.address.should.equal('voicevox:ずんだもん/ノーマル?speed=1.4');
            voice.displayName.should.equal('ずんだもん（ノーマル） ?speed=1.4');
        });
    });

    describe('#loadVoiceCatalog', () => {
        const voiceJson = (address, character, style, available = true) => ({
            address,
            kind: 'voice',
            engine: address.split(':')[0],
            character,
            style,
            available,
        });
        const page1 = {
            voices: [
                voiceJson('ebyroid:kiritan', 'kiritan', null),
                voiceJson('voicevox:ずんだもん/ノーマル', 'ずんだもん', 'ノーマル'),
                voiceJson('voicevox:ずんだもん/あまあま', 'ずんだもん', 'あまあま'),
            ],
            next_cursor: '3',
        };
        const page2 = {
            voices: [
                voiceJson('voicevox:小夜-sayo/ノーマル', '小夜/SAYO', 'ノーマル', false),
                { address: 'zundamon', kind: 'alias', engine: 'voicevox', target: 'voicevox:ずんだもん' },
            ],
            next_cursor: null,
        };

        specify('全ページを取得し、キャラごとにまとめ、別名・プリセットを分ける', async () => {
            routes['/v1/voices'] = (q) => (q.get('cursor') === '3' ? page2 : page1);
            const catalog = await adapter().loadVoiceCatalog();

            requests.map((r) => r.query.cursor).should.deep.equal([undefined, '3']);
            catalog.characters.should.deep.equal([
                { address: 'ebyroid:kiritan', name: null, styles: [], available: true },
                { address: 'voicevox:ずんだもん', name: null, styles: ['ノーマル', 'あまあま'], available: true },
                // 指定に使う名前と元の名前が違えば元の名前を残す。止まっているエンジンのキャラも外さない
                { address: 'voicevox:小夜-sayo', name: '小夜/SAYO', styles: ['ノーマル'], available: false },
            ]);
            catalog.named.should.deep.equal([{ name: 'zundamon', target: 'voicevox:ずんだもん' }]);
        });

        specify('取得できなければ、利用者に伝わるエラーにする', async () => {
            const unreachable = new TtshubVoiceCatalogAdapter({ ttshubUrl: 'http://127.0.0.1:1' });

            let error;
            try {
                await unreachable.loadVoiceCatalog();
            } catch (e) {
                error = e;
            }
            error.eby.should.be.true;
            error.message.should.include('声の一覧を取得できなかった');
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
    });

    specify('一覧は持たないので、利用者に伝わるエラーにする', async () => {
        let error;
        try {
            await new PassthroughVoiceCatalog().loadVoiceCatalog();
        } catch (e) {
            error = e;
        }
        error.eby.should.be.true;
    });
});

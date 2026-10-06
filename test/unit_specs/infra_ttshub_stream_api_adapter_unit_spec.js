require('chai').should();
const http = require('http');
const log4js = require('log4js');
const TtshubStreamApiAdapter = require('../../src/infra/ttshub/ttshub_stream_api_adapter');
const AppConfig = require('../../src/core/app_config');
const VoiceroidAudio = require('../../src/domain/entity/audios/voiceroid_audio');

/************************************************************************
 * TtshubStreamApiAdapterクラス単体スペック
 *
 * 期待動作：話者の指定をそのまま ttshub に渡し、48kHz ステレオの PCM をそのまま返す
 * 備考：ttshub の代わりにローカルのHTTPサーバを立てる
 ***********************************************************************/

function readAll(stream) {
    return new Promise((resolve, reject) => {
        const chunks = [];
        stream.on('data', (c) => chunks.push(c));
        stream.on('end', () => resolve(Buffer.concat(chunks)));
        stream.on('error', reject);
    });
}

describe('TtshubStreamApiAdapter', () => {
    let server;
    let port;
    let requests;
    let respond;

    beforeEach(async () => {
        requests = [];
        respond = (res) => {
            res.writeHead(200, {
                'Content-Type': 'audio/pcm',
                'X-TTS-PCM-Sample-Rate': '48000',
                'X-TTS-PCM-Channels': '2',
                'X-TTS-Fallback': 'none',
            });
            res.end(Buffer.from([1, 2, 3, 4, 5, 6, 7, 8]));
        };
        server = http.createServer((req, res) => {
            const chunks = [];
            req.on('data', (c) => chunks.push(c));
            req.on('end', () => {
                requests.push({
                    url: req.url,
                    requestId: req.headers['x-request-id'],
                    body: JSON.parse(Buffer.concat(chunks).toString('utf8')),
                });
                respond(res);
            });
        });
        await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
        port = server.address().port;
    });

    afterEach(async () => {
        await new Promise((resolve) => server.close(resolve));
    });

    function adapter() {
        // 末尾のスラッシュは取り除いて /v1/speech をつなぐ
        return new TtshubStreamApiAdapter({ ttshubUrl: `http://127.0.0.1:${port}/` });
    }

    specify('話者の指定を解釈せずに渡し、Discord向けの形式を要求する', async () => {
        const speaker = 'voicevox:ずんだもん/あまあま?speed=1.2';
        const stream = await adapter().getVoiceroidStream(new VoiceroidAudio({ content: 'こんにちは', speaker }));
        (await readAll(stream)).should.deep.equal(Buffer.from([1, 2, 3, 4, 5, 6, 7, 8]));

        requests.length.should.equal(1);
        requests[0].url.should.equal('/v1/speech');
        requests[0].body.should.deep.equal({
            text: 'こんにちは',
            voice: speaker,
            format: { codec: 'pcm_s16le', sample_rate: 48000, channels: 2 },
        });
    });

    specify('default もそのまま渡す（どの声にするかは ttshub が決める）', async () => {
        const stream = await adapter().getVoiceroidStream(new VoiceroidAudio({ content: 'あ', speaker: 'default' }));
        await readAll(stream);
        requests[0].body.voice.should.equal('default');
    });

    specify('要求と違う形式が返ったら失敗する', async () => {
        respond = (res) => {
            res.writeHead(200, { 'X-TTS-PCM-Sample-Rate': '24000', 'X-TTS-PCM-Channels': '1' });
            res.end(Buffer.alloc(4));
        };
        let error;
        try {
            await adapter().getVoiceroidStream(new VoiceroidAudio({ content: 'あ', speaker: 'default' }));
        } catch (err) {
            error = err;
        }
        error.message.should.include('24000Hz 1ch');
    });

    specify('ttshub がエラーを返したら失敗する', async () => {
        respond = (res) => {
            res.writeHead(503, { 'Content-Type': 'application/json' });
            res.end('{"error":{"code":"unavailable","message":"x"}}');
        };
        let error;
        try {
            await adapter().getVoiceroidStream(new VoiceroidAudio({ content: 'あ', speaker: 'default' }));
        } catch (err) {
            error = err;
        }
        error.response.status.should.equal(503);
    });

    specify('ttshub のログと突き合わせられるよう、リクエストごとに別の ID を送る', async () => {
        for (let i = 0; i < 2; i++) {
            await readAll(
                await adapter().getVoiceroidStream(new VoiceroidAudio({ content: 'あ', speaker: 'default' }))
            );
        }
        requests.map((r) => r.requestId).forEach((id) => id.should.match(/^[A-Za-z0-9_-]{1,64}$/));
        requests[0].requestId.should.not.equal(requests[1].requestId);
    });

    describe('ログ', () => {
        let recording;

        beforeEach(() => {
            log4js.configure({
                appenders: { rec: { type: 'recording' } },
                categories: { default: { appenders: ['rec'], level: 'all' } },
            });
            recording = require('log4js/lib/appenders/recording');
            recording.reset();
        });

        afterEach(() => {
            // test/setup.js と同じ設定（ログを出さない）に戻す
            log4js.configure({
                appenders: { out: { type: 'stdout' } },
                categories: { default: { appenders: ['out'], level: 'off' } },
            });
        });

        const logged = () => recording.replay().map((e) => e.data.map(String).join(' '));

        specify('合成できなかったら、送った ID を付けて記録し、本文は記録しない', async () => {
            respond = (res) => {
                res.writeHead(503, { 'Content-Type': 'application/json' });
                res.end('{"error":{"code":"unavailable","message":"x"}}');
            };
            const secret = 'ひみつの本文';
            await adapter()
                .getVoiceroidStream(new VoiceroidAudio({ content: secret, speaker: 'default' }))
                .catch(() => {});

            const lines = logged().filter((l) => l.includes('合成できなかった'));
            lines.length.should.equal(1);
            lines[0].should.include(`id=${requests[0].requestId}`);
            lines[0].should.include('文字数=6');
            lines[0].should.include('HTTP 503');
            logged().forEach((l) => l.should.not.include(secret));
        });

        specify('読み上げをやめて中断したときは、失敗として記録しない', async () => {
            respond = () => {}; // 応答しない
            const controller = new AbortController();
            const pending = adapter().getVoiceroidStream(
                new VoiceroidAudio({ content: 'あ', speaker: 'default' }),
                controller.signal
            );
            await new Promise((resolve) => setTimeout(resolve, 20));
            controller.abort();
            await pending.catch(() => {});

            logged().filter((l) => l.includes('合成できなかった') || l.includes('応答が始まらなかった')).should.be
                .empty;
        });
    });

    specify('RFC 8187 形式のヘッダ値を読む', () => {
        const { decodeExtValue } = TtshubStreamApiAdapter;
        decodeExtValue("UTF-8''voicevox%3A%E3%81%9A%E3%82%93%E3%81%A0%E3%82%82%E3%82%93").should.equal(
            'voicevox:ずんだもん'
        );
        decodeExtValue('plain').should.equal('plain');
        (decodeExtValue(undefined) === undefined).should.be.true;
    });
});

describe('AppConfig.withDependent', () => {
    specify('指定したインターフェースの実装だけを差し替える', () => {
        const config = new AppConfig([
            { interface: 'IVoiceroidStreamRepo', dependent: 'EbyroidStreamApiAdapter' },
            { interface: 'IOther', dependent: 'Other' },
        ]);
        const replaced = config.withDependent('IVoiceroidStreamRepo', 'TtshubStreamApiAdapter');
        replaced.configurations.should.deep.include({
            interface: 'IVoiceroidStreamRepo',
            dependent: 'TtshubStreamApiAdapter',
        });
        replaced.configurations.should.deep.include({ interface: 'IOther', dependent: 'Other' });
        replaced.configurations.length.should.equal(2);
        // 元のコンフィグは変わらない
        config.configurations[0].dependent.should.equal('EbyroidStreamApiAdapter');
    });
});

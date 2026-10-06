const should = require('chai').should();
const sinon = require('sinon');
const { Readable } = require('stream');
const StreamFetcher = require('../../src/domain/service/stream_fetcher');

/************************************************************************
 * StreamFetcherクラス単体スペック
 *
 * メソッド：#fetch
 * 期待動作：AudioT配列をストリームに変換する
 * 備考：リポジトリをsinon stubで差し替え
 ***********************************************************************/

describe('StreamFetcher', () => {
    let vrStreamRepo, foleyStreamRepo;
    let fetcher;

    function createMockStream() {
        return new Readable({
            read() {
                this.push(null);
            },
        });
    }

    async function consume(stream) {
        const chunks = [];
        for await (const chunk of stream) chunks.push(chunk);
        return Buffer.concat(chunks);
    }

    beforeEach(() => {
        vrStreamRepo = {
            getVoiceroidStream: sinon.stub().resolves(createMockStream()),
        };
        foleyStreamRepo = {
            getFoleyStream: sinon.stub().resolves(createMockStream()),
        };
        fetcher = new StreamFetcher(vrStreamRepo, foleyStreamRepo);
    });

    afterEach(() => {
        sinon.restore();
    });

    describe('#fetch', () => {
        context('正常系', () => {
            specify('fetchしただけでは取得を始めない', async () => {
                const audios = [{ type: 'voiceroid', content: 'テスト', speaker: 'kiritan' }];
                const stream = await fetcher.fetch(audios);
                vrStreamRepo.getVoiceroidStream.called.should.be.false;
                stream.destroy();
            });

            specify(
                'voiceroidタイプのAudioは、読み取りを始めるとvrStreamRepoから中断の合図付きで取得する',
                async () => {
                    const audio = { type: 'voiceroid', content: 'テスト', speaker: 'kiritan' };
                    const stream = await fetcher.fetch([audio]);
                    await consume(stream);
                    vrStreamRepo.getVoiceroidStream.calledOnce.should.be.true;
                    vrStreamRepo.getVoiceroidStream.firstCall.args[0].should.equal(audio);
                    vrStreamRepo.getVoiceroidStream.firstCall.args[1].should.be.an.instanceOf(AbortSignal);
                }
            );

            specify('startで読み取りの前に取得を始められる', async () => {
                const stream = await fetcher.fetch([{ type: 'voiceroid', content: 'テスト', speaker: 'kiritan' }]);
                stream.start();
                vrStreamRepo.getVoiceroidStream.calledOnce.should.be.true;
                stream.destroy();
            });

            specify('単一のvoiceroid音声でも末尾無音を除去する', async () => {
                const sound = Buffer.alloc(4);
                sound.writeInt16LE(1000, 0);
                sound.writeInt16LE(1000, 2);
                const trailingSilence = Buffer.alloc(4 * 480);
                vrStreamRepo.getVoiceroidStream.resolves(Readable.from([Buffer.concat([sound, trailingSilence])]));

                const stream = await fetcher.fetch([{ type: 'voiceroid', content: 'テスト', speaker: 'kiritan' }]);

                (await consume(stream)).should.deep.equal(sound);
            });

            specify('foleyタイプのAudioでfoleyStreamRepoを呼ぶ', async () => {
                const audios = [{ type: 'foley', keyword: 'ドンッ' }];
                const stream = await fetcher.fetch(audios);
                await consume(stream);
                foleyStreamRepo.getFoleyStream.calledOnce.should.be.true;
            });

            specify('混合配列で両方のリポジトリを呼ぶ', async () => {
                const audios = [
                    { type: 'voiceroid', content: 'テスト', speaker: 'kiritan' },
                    { type: 'foley', keyword: 'ドンッ' },
                ];
                const stream = await fetcher.fetch(audios);
                await consume(stream);
                vrStreamRepo.getVoiceroidStream.calledOnce.should.be.true;
                foleyStreamRepo.getFoleyStream.calledOnce.should.be.true;
            });

            specify('空配列ではリポジトリを呼ばない', async () => {
                const stream = await fetcher.fetch([]);
                vrStreamRepo.getVoiceroidStream.called.should.be.false;
                foleyStreamRepo.getFoleyStream.called.should.be.false;
                should.exist(stream);
            });
        });

        context('異常系', () => {
            specify('未知のAudioタイプはErrorを投げる', async () => {
                const audios = [{ type: 'unknown' }];
                try {
                    await fetcher.fetch(audios);
                    should.fail('should have thrown');
                } catch (e) {
                    e.message.should.equal('unreachable');
                }
            });

            specify('先読みで読み手がいない間に取得が失敗してもuncaughtExceptionにならない', async () => {
                vrStreamRepo.getVoiceroidStream.rejects(new Error('Request failed with status code 500'));

                const stream = await fetcher.fetch([{ type: 'voiceroid', content: 'テスト', speaker: 'kiritan' }]);
                // 読み手を付けずに先読みだけ始める（再生待ちの先頭の状態）。errorリスナーが無ければここで例外になる
                stream.start();
                await new Promise((resolve) => stream.once('close', resolve));

                stream.destroyed.should.be.true;
                stream.errored.message.should.equal('Request failed with status code 500');
            });
        });

        context('中断', () => {
            specify('取得中に破棄すると、リポジトリに渡した中断の合図が送られる', async () => {
                let signal;
                vrStreamRepo.getVoiceroidStream.callsFake((_audio, s) => {
                    signal = s;
                    return new Promise(() => {});
                });
                const stream = await fetcher.fetch([{ type: 'voiceroid', content: 'テスト', speaker: 'kiritan' }]);
                stream.start();
                signal.aborted.should.be.false;

                stream.destroy();

                signal.aborted.should.be.true;
            });

            specify('再生中に破棄すると、取得したレスポンスのストリームまで破棄される', async () => {
                // 終わらないレスポンス
                const response = new Readable({ read() {} });
                response.push(Buffer.alloc(4, 1));
                vrStreamRepo.getVoiceroidStream.resolves(response);
                const stream = await fetcher.fetch([{ type: 'voiceroid', content: 'テスト', speaker: 'kiritan' }]);
                stream.resume();
                await new Promise((resolve) => setImmediate(resolve));

                stream.destroy();
                await new Promise((resolve) => setImmediate(resolve));

                response.destroyed.should.be.true;
            });

            specify('再生を待たずに、取得したレスポンスを最後まで受け取る', async () => {
                // ttshub は流し終えるまで同時合成数の枠を持ち続けるため、読み手が遅くても受け取り切る
                const chunk = Buffer.alloc(3840, 0x40);
                let sent = 0;
                const response = new Readable({
                    read() {
                        this.push(sent++ < 500 ? chunk : null); // 約10秒分
                    },
                });
                vrStreamRepo.getVoiceroidStream.resolves(response);
                const stream = await fetcher.fetch([{ type: 'voiceroid', content: 'テスト', speaker: 'kiritan' }]);
                stream.start();
                for (let i = 0; i < 20; i++) await new Promise((resolve) => setImmediate(resolve));

                response.readableEnded.should.be.true;
                stream.destroy();
            });

            specify(
                '先読み済みで再生前のレスポンスがエラーになっても、uncaughtExceptionにならずerrorとして伝搬する',
                async () => {
                    const response = new Readable({ read() {} });
                    vrStreamRepo.getVoiceroidStream.resolves(response);
                    const stream = await fetcher.fetch([{ type: 'voiceroid', content: 'テスト', speaker: 'kiritan' }]);
                    stream.start();
                    await new Promise((resolve) => setImmediate(resolve));

                    response.destroy(new Error('socket hang up'));
                    await new Promise((resolve) => stream.once('close', resolve));

                    stream.errored.message.should.equal('socket hang up');
                }
            );
        });
    });
});

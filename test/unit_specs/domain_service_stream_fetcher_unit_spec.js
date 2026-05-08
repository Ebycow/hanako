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
            specify('voiceroidタイプのAudioでvrStreamRepoを呼ぶ', async () => {
                const audios = [{ type: 'voiceroid', content: 'テスト', speaker: 'kiritan' }];
                const stream = await fetcher.fetch(audios);
                vrStreamRepo.getVoiceroidStream.calledOnce.should.be.true;
                should.exist(stream);
            });

            specify('foleyタイプのAudioでfoleyStreamRepoを呼ぶ', async () => {
                const audios = [{ type: 'foley', keyword: 'ドンッ' }];
                const stream = await fetcher.fetch(audios);
                foleyStreamRepo.getFoleyStream.calledOnce.should.be.true;
                should.exist(stream);
            });

            specify('混合配列で両方のリポジトリを呼ぶ', async () => {
                const audios = [
                    { type: 'voiceroid', content: 'テスト', speaker: 'kiritan' },
                    { type: 'foley', keyword: 'ドンッ' },
                ];
                const stream = await fetcher.fetch(audios);
                vrStreamRepo.getVoiceroidStream.calledOnce.should.be.true;
                foleyStreamRepo.getFoleyStream.calledOnce.should.be.true;
                should.exist(stream);
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
        });
    });
});

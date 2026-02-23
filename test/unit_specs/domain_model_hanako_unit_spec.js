const should = require('chai').should();
const { basicHanako } = require('../helpers/blueprints');

/************************************************************************
 * Hanakoドメインモデル単体スペック
 *
 * 期待動作：読み上げ花子の状態を保持し振る舞いを提供する
 * 備考：なし
 ***********************************************************************/

describe('Hanako', () => {
    describe('プロパティ委譲', () => {
        specify('serverIdはserverStatusから委譲される', () => {
            const hanako = basicHanako({ serverStatus: { serverId: 'server-001' } });
            hanako.serverId.should.equal('server-001');
        });

        specify('userIdはserverStatusから委譲される', () => {
            const hanako = basicHanako({ serverStatus: { userId: 'user-001' } });
            hanako.userId.should.equal('user-001');
        });

        specify('prefixはserverStatusから委譲される', () => {
            const hanako = basicHanako({ serverStatus: { prefix: '!' } });
            hanako.prefix.should.equal('!');
        });
    });

    describe('#isReadingChannel', () => {
        specify('読み上げ対象チャンネルならtrueを返す', () => {
            const hanako = basicHanako({
                voiceStatus: { readingChannelsId: ['ch-001', 'ch-002'] },
            });
            hanako.isReadingChannel('ch-001').should.be.true;
        });

        specify('読み上げ対象外ならfalseを返す', () => {
            const hanako = basicHanako({
                voiceStatus: { readingChannelsId: ['ch-001'] },
            });
            hanako.isReadingChannel('ch-999').should.be.false;
        });

        specify('voiceStatusがnullならfalseを返す', () => {
            const hanako = basicHanako({ voiceStatus: null });
            hanako.isReadingChannel('ch-001').should.be.false;
        });
    });

    describe('#hasCommandPrefix', () => {
        specify('プリフィクスで始まるテキストはtrueを返す', () => {
            const hanako = basicHanako({ serverStatus: { prefix: '>' } });
            hanako.hasCommandPrefix('>ask').should.be.true;
        });

        specify('プリフィクスで始まらないテキストはfalseを返す', () => {
            const hanako = basicHanako({ serverStatus: { prefix: '>' } });
            hanako.hasCommandPrefix('hello').should.be.false;
        });
    });

    describe('#pageables', () => {
        specify('3つの辞書を配列で返す', () => {
            const hanako = basicHanako();
            hanako.pageables.should.be.an('array').that.has.lengthOf(3);
        });

        specify('wordDictionary, silenceDictionary, foleyDictionaryの順', () => {
            const hanako = basicHanako();
            hanako.pageables[0].should.equal(hanako.wordDictionary);
            hanako.pageables[1].should.equal(hanako.silenceDictionary);
            hanako.pageables[2].should.equal(hanako.foleyDictionary);
        });
    });

    describe('不変性', () => {
        specify('settingsは書き換え不可', () => {
            const hanako = basicHanako();
            const original = hanako.settings;
            hanako.settings = null;
            hanako.settings.should.equal(original);
        });
    });
});

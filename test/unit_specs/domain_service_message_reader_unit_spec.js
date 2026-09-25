const should = require('chai').should();
const MessageReader = require('../../src/domain/service/message_reader');
const EbyAbortError = require('../../src/core/errors/eby_abort_error');
const {
    basicHanako,
    dmessageBlueprint,
    silenceDictionaryLineBlueprint,
    wordDictionaryLineBlueprint,
    foleyDictionaryLineBlueprint,
    SilenceDictionary,
    WordDictionary,
    FoleyDictionary,
} = require('../helpers/blueprints');

/************************************************************************
 * MessageReaderクラス単体スペック
 *
 * メソッド：#read
 * 期待動作：Discordメッセージを音声読み上げ手続き配列に変換する
 * 備考：Silence中ユーザー、空テキスト、記号のみテキストはabort
 ***********************************************************************/

describe('MessageReader', () => {
    // MessageReaderは内部でTerminalReaderを使用するため正しいspeaker形状が必要
    function readerHanako(overrides) {
        return basicHanako({ settings: { speaker: { default: 'kiritan' } }, ...overrides });
    }

    describe('#read', () => {
        context('正常系', () => {
            specify('通常テキストをAudioT配列に変換する', async () => {
                const reader = new MessageReader();
                const hanako = readerHanako();
                const dm = dmessageBlueprint({ type: 'read', content: 'こんにちは' });
                const audios = await reader.read(hanako, dm);
                audios.should.be.an('array').that.is.not.empty;
                audios.forEach((audio) => {
                    audio.type.should.be.oneOf(['voiceroid', 'foley']);
                });
            });

            specify('結果のAudioTにPlainやNoopが含まれない', async () => {
                const reader = new MessageReader();
                const hanako = readerHanako();
                const dm = dmessageBlueprint({ type: 'read', content: 'テスト文章です' });
                const audios = await reader.read(hanako, dm);
                audios.forEach((audio) => {
                    audio.type.should.not.equal('plain');
                    audio.type.should.not.equal('noop');
                });
            });

            specify('SE名の外側だけを教育辞書で置換してSEを再生する', async () => {
                const reader = new MessageReader();
                const wordLine = wordDictionaryLineBlueprint({ from: 'CPU', to: 'シーピーユー' });
                const wordDictionary = new WordDictionary({
                    id: 'wd',
                    serverId: 'mock-server-id',
                    lines: [wordLine],
                });
                const foleyLine = foleyDictionaryLineBlueprint({ id: 'alert-se', keyword: 'CPU警告音' });
                const foleyDictionary = new FoleyDictionary({
                    id: 'fd',
                    serverId: 'mock-server-id',
                    lines: [foleyLine],
                });
                const hanako = readerHanako({ wordDictionary, foleyDictionary });
                const dm = dmessageBlueprint({ type: 'read', content: 'CPU CPU警告音' });

                const audios = await reader.read(hanako, dm);

                audios.map((audio) => audio.type).should.deep.equal(['voiceroid', 'foley']);
                audios[0].content.should.equal('シーピーユー ');
                audios[1].foleyId.should.equal('alert-se');
            });
        });

        context('異常系', () => {
            specify('Silence中のユーザーはabortする', async () => {
                const reader = new MessageReader();
                const line = silenceDictionaryLineBlueprint({ userId: 'mock-user-id' });
                const sd = new SilenceDictionary({ id: 'sd', serverId: 'mock-server-id', lines: [line] });
                const hanako = readerHanako({ silenceDictionary: sd });
                const dm = dmessageBlueprint({ type: 'read', content: 'こんにちは', userId: 'mock-user-id' });
                try {
                    await reader.read(hanako, dm);
                    should.fail('should have rejected');
                } catch (e) {
                    e.should.be.instanceOf(EbyAbortError);
                }
            });

            specify('空テキストはabortする', async () => {
                const reader = new MessageReader();
                const hanako = readerHanako();
                const dm = dmessageBlueprint({ type: 'read', content: '' });
                try {
                    await reader.read(hanako, dm);
                    should.fail('should have rejected');
                } catch (e) {
                    e.should.be.instanceOf(EbyAbortError);
                }
            });

            specify('記号のみのテキストはabortする', async () => {
                const reader = new MessageReader();
                const hanako = readerHanako();
                const dm = dmessageBlueprint({ type: 'read', content: '...' });
                try {
                    await reader.read(hanako, dm);
                    should.fail('should have rejected');
                } catch (e) {
                    e.should.be.instanceOf(EbyAbortError);
                }
            });
        });
    });
});

const should = require('chai').should();
const TerminalReader = require('../../src/domain/model/readers/terminal_reader');
const Plain = require('../../src/domain/entity/audios/plain');
const VoiceroidAudio = require('../../src/domain/entity/audios/voiceroid_audio');
const { basicHanako, dmessageBlueprint } = require('../helpers/blueprints');

/************************************************************************
 * TerminalReaderクラス単体スペック
 *
 * メソッド：#read
 * 期待動作：PlainをVoiceroidAudioまたはNoopに変換する
 * 備考：全Plainを消費する最終リーダー
 ***********************************************************************/

describe('TerminalReader', () => {
    // TerminalReaderはspeaker[userId]でルックアップするため正しい形状が必要
    function readerHanako() {
        return basicHanako({ settings: { speaker: { default: 'kiritan' } } });
    }

    specify('typeはterminalを返す', () => {
        const dm = dmessageBlueprint({ type: 'read' });
        const reader = new TerminalReader(readerHanako(), dm);
        reader.type.should.equal('terminal');
    });

    describe('#read', () => {
        context('正常系', () => {
            specify('Plain以外の入力はそのまま返す', () => {
                const dm = dmessageBlueprint({ type: 'read' });
                const reader = new TerminalReader(readerHanako(), dm);
                const va = new VoiceroidAudio({ content: 'テスト', speaker: 'kiritan' });
                const result = reader.read(va);
                result.should.have.lengthOf(1);
                result[0].should.equal(va);
            });

            specify('通常テキストのPlainをVoiceroidAudioに変換する', () => {
                const dm = dmessageBlueprint({ type: 'read' });
                const reader = new TerminalReader(readerHanako(), dm);
                const plain = new Plain({ content: 'こんにちは' });
                const result = reader.read(plain);
                result.should.have.lengthOf(1);
                result[0].type.should.equal('voiceroid');
                result[0].content.should.equal('こんにちは');
            });

            specify('空のPlainはNoopに変換する', () => {
                const dm = dmessageBlueprint({ type: 'read' });
                const reader = new TerminalReader(readerHanako(), dm);
                const plain = new Plain({ content: '' });
                const result = reader.read(plain);
                result.should.have.lengthOf(1);
                result[0].type.should.equal('noop');
            });

            specify('記号のみのPlainはNoopに変換する', () => {
                const dm = dmessageBlueprint({ type: 'read' });
                const reader = new TerminalReader(readerHanako(), dm);
                const plain = new Plain({ content: '...' });
                const result = reader.read(plain);
                result.should.have.lengthOf(1);
                result[0].type.should.equal('noop');
            });

            specify('壊れた単語(=, - 等)を日本語読みに置換する', () => {
                const dm = dmessageBlueprint({ type: 'read' });
                const reader = new TerminalReader(readerHanako(), dm);
                const plain = new Plain({ content: 'a=b' });
                const result = reader.read(plain);
                result.should.have.lengthOf(1);
                result[0].type.should.equal('voiceroid');
                result[0].content.should.include('イコール');
            });
        });
    });
});

const should = require('chai').should();
const Reado = require('../../src/domain/model/reado');
const {
    basicHanako,
    dmessageBlueprint,
    foleyDictionaryLineBlueprint,
    FoleyDictionary,
} = require('../helpers/blueprints');

/************************************************************************
 * Readoクラス単体スペック
 *
 * メソッド：#compose
 * 期待動作：テキストをオーディオ配列に変換する
 * 備考：Plainが残らないこと、Noopが除去されることが重要
 ***********************************************************************/

describe('Reado', () => {
    // Readoは内部でTerminalReaderを使用し、speaker[userId]でルックアップするため正しい形状が必要
    function readoHanako(overrides) {
        return basicHanako({ settings: { speaker: { default: 'kiritan' } }, ...overrides });
    }

    describe('#compose', () => {
        context('正常系', () => {
            specify('通常テキストをVoiceroidAudio配列に変換する', () => {
                const dm = dmessageBlueprint({ type: 'read' });
                const reado = new Reado(readoHanako(), dm);
                const result = reado.compose('こんにちは');
                result.should.be.an('array').that.is.not.empty;
                result.forEach((audio) => {
                    audio.type.should.be.oneOf(['voiceroid', 'foley']);
                });
            });

            specify('SEキーワードを含むテキストはVoiceroidAudioとFoleyAudioの混合配列を返す', () => {
                const line = foleyDictionaryLineBlueprint({ keyword: 'ドンッ' });
                const fd = new FoleyDictionary({ id: 'fd', serverId: 'mock-server-id', lines: [line] });
                const dm = dmessageBlueprint({ type: 'read' });
                const reado = new Reado(readoHanako({ foleyDictionary: fd }), dm);
                const result = reado.compose('前テキストドンッ後テキスト');
                const types = result.map((r) => r.type);
                types.should.include('foley');
                types.should.include('voiceroid');
            });

            specify('Plainが結果に含まれない', () => {
                const dm = dmessageBlueprint({ type: 'read' });
                const reado = new Reado(readoHanako(), dm);
                const result = reado.compose('テスト');
                result.forEach((audio) => {
                    audio.type.should.not.equal('plain');
                });
            });

            specify('Noopが結果に含まれない', () => {
                const dm = dmessageBlueprint({ type: 'read' });
                const reado = new Reado(readoHanako(), dm);
                const result = reado.compose('テスト');
                result.forEach((audio) => {
                    audio.type.should.not.equal('noop');
                });
            });

            specify('記号のみのテキストは空配列を返す', () => {
                const dm = dmessageBlueprint({ type: 'read' });
                const reado = new Reado(readoHanako(), dm);
                const result = reado.compose('...');
                result.should.be.an('array').that.is.empty;
            });
        });
    });
});

const should = require('chai').should();
const FoleyReader = require('../../src/domain/model/readers/foley_reader');
const Plain = require('../../src/domain/entity/audios/plain');
const VoiceroidAudio = require('../../src/domain/entity/audios/voiceroid_audio');
const { basicHanako, foleyDictionaryLineBlueprint, FoleyDictionary } = require('../helpers/blueprints');

/************************************************************************
 * FoleyReaderクラス単体スペック
 *
 * メソッド：#read
 * 期待動作：PlainテキストからSEキーワードを検出しFoleyAudioに分割する
 * 備考：なし
 ***********************************************************************/

describe('FoleyReader', () => {
    specify('typeはfoleyを返す', () => {
        const reader = new FoleyReader(basicHanako());
        reader.type.should.equal('foley');
    });

    describe('#read', () => {
        context('正常系', () => {
            specify('Plain以外の入力はそのまま返す', () => {
                const reader = new FoleyReader(basicHanako());
                const va = new VoiceroidAudio({ content: 'テスト', speaker: 'kiritan' });
                const result = reader.read(va);
                result.should.have.lengthOf(1);
                result[0].should.equal(va);
            });

            specify('SEキーワードを含まないPlainはそのまま返す', () => {
                const reader = new FoleyReader(basicHanako());
                const plain = new Plain({ content: 'テスト' });
                const result = reader.read(plain);
                result.should.have.lengthOf(1);
                result[0].type.should.equal('plain');
            });

            specify('SEキーワードを含むPlainをFoleyAudioとPlainに分割する', () => {
                const line = foleyDictionaryLineBlueprint({ keyword: 'ドンッ' });
                const fd = new FoleyDictionary({ id: 'fd', serverId: 'mock-server-id', lines: [line] });
                const reader = new FoleyReader(basicHanako({ foleyDictionary: fd }));
                const plain = new Plain({ content: '前テキストドンッ後テキスト' });
                const result = reader.read(plain);

                // 前テキスト(plain) + ドンッ(foley) + 後テキスト(plain) の3要素
                result.length.should.be.at.least(3);
                const types = result.map((r) => r.type);
                types.should.include('foley');
                types.should.include('plain');
            });

            specify('SE辞書が空ならPlainをそのまま返す', () => {
                const reader = new FoleyReader(basicHanako());
                const plain = new Plain({ content: 'テスト' });
                const result = reader.read(plain);
                result.should.have.lengthOf(1);
                result[0].type.should.equal('plain');
            });
        });
    });
});

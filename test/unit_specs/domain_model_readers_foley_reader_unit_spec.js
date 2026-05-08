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

        context('エッジケース', () => {
            specify('複数の異なるSEキーワードを含むテキストをすべて分割する', () => {
                const line1 = foleyDictionaryLineBlueprint({ id: 'fdl-1', keyword: 'ドンッ' });
                const line2 = foleyDictionaryLineBlueprint({ id: 'fdl-2', keyword: 'バシッ' });
                const fd = new FoleyDictionary({ id: 'fd', serverId: 'mock-server-id', lines: [line1, line2] });
                const reader = new FoleyReader(basicHanako({ foleyDictionary: fd }));
                const plain = new Plain({ content: 'あドンッいバシッう' });
                const result = reader.read(plain);

                const foleyCount = result.filter((r) => r.type === 'foley').length;
                foleyCount.should.equal(2);
            });

            specify('キーワードがテキスト先頭にある場合Noopが先頭に来る', () => {
                const line = foleyDictionaryLineBlueprint({ keyword: 'ドンッ' });
                const fd = new FoleyDictionary({ id: 'fd', serverId: 'mock-server-id', lines: [line] });
                const reader = new FoleyReader(basicHanako({ foleyDictionary: fd }));
                const plain = new Plain({ content: 'ドンッ後テキスト' });
                const result = reader.read(plain);

                // 先頭の空文字列splitはnoopになる
                result[0].type.should.equal('noop');
            });

            specify('キーワードのみのテキストはFoleyAudioとNoopのみを返す', () => {
                const line = foleyDictionaryLineBlueprint({ keyword: 'ドンッ' });
                const fd = new FoleyDictionary({ id: 'fd', serverId: 'mock-server-id', lines: [line] });
                const reader = new FoleyReader(basicHanako({ foleyDictionary: fd }));
                const plain = new Plain({ content: 'ドンッ' });
                const result = reader.read(plain);

                result.every((r) => r.type === 'foley' || r.type === 'noop').should.be.true;
                result.some((r) => r.type === 'foley').should.be.true;
            });

            specify('同一キーワードが複数回出現する場合すべて置換する', () => {
                const line = foleyDictionaryLineBlueprint({ keyword: 'ドンッ' });
                const fd = new FoleyDictionary({ id: 'fd', serverId: 'mock-server-id', lines: [line] });
                const reader = new FoleyReader(basicHanako({ foleyDictionary: fd }));
                const plain = new Plain({ content: 'ドンッあドンッいドンッ' });
                const result = reader.read(plain);

                const foleyCount = result.filter((r) => r.type === 'foley').length;
                foleyCount.should.equal(3);
            });

            specify('長いキーワードが短いキーワードより先にマッチする', () => {
                // 「ドンドンッ」(4文字)と「ドン」(2文字)
                const longKw = foleyDictionaryLineBlueprint({ id: 'fdl-long', keyword: 'ドンドンッ' });
                const shortKw = foleyDictionaryLineBlueprint({ id: 'fdl-short', keyword: 'ドン' });
                // わざと短い方を先に渡す（FoleyDictionaryがソートするので問題ない）
                const fd = new FoleyDictionary({ id: 'fd', serverId: 'mock-server-id', lines: [shortKw, longKw] });
                const reader = new FoleyReader(basicHanako({ foleyDictionary: fd }));
                const plain = new Plain({ content: 'ドンドンッ' });
                const result = reader.read(plain);

                // 「ドンドンッ」が先にマッチするので、foleyが1つ
                // 「ドン」が残りテキストに適用されるが、空なのでマッチしない
                const foleyItems = result.filter((r) => r.type === 'foley');
                foleyItems.should.have.lengthOf(1);
                foleyItems[0].foleyId.should.equal('fdl-long');
            });
        });
    });
});

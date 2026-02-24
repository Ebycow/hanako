const should = require('chai').should();
const { FoleyAudio } = require('../helpers/blueprints');

/************************************************************************
 * FoleyAudioクラス単体スペック
 *
 * 期待動作：SE音声挿入エンティティの構築・IDエンコード
 * 備考：idはserverId+foleyIdのBase64エンコード
 ***********************************************************************/

describe('FoleyAudio', () => {
    describe('構築', () => {
        specify('typeは常にfoleyを返す', () => {
            const audio = new FoleyAudio({ serverId: 'server-1', foleyId: 'fdl-1' });
            audio.type.should.equal('foley');
        });

        specify('serverId, foleyIdゲッターが正しい値を返す', () => {
            const audio = new FoleyAudio({ serverId: 'server-1', foleyId: 'fdl-1' });
            audio.serverId.should.equal('server-1');
            audio.foleyId.should.equal('fdl-1');
        });

        specify('idはserverId+foleyIdのBase64エンコードである', () => {
            const audio = new FoleyAudio({ serverId: 'server-1', foleyId: 'fdl-1' });
            const expected = Buffer.from('server-1' + 'fdl-1').toString('base64');
            audio.id.should.equal(expected);
        });
    });

    describe('イミュータビリティ', () => {
        specify('dataプロパティは書き換え不可', () => {
            const audio = new FoleyAudio({ serverId: 'server-1', foleyId: 'fdl-1' });
            const original = audio.data;
            audio.data = {};
            audio.data.should.equal(original);
        });
    });
});

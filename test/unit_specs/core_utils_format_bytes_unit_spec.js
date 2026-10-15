require('chai').should();
const formatBytes = require('../../src/core/utils/format_bytes');

/************************************************************************
 * formatBytes関数単体スペック
 *
 * 期待動作：バイト数を有効数字3桁・1000区切りのSI単位で、空白なしの表記にする
 * 備考：なし
 ***********************************************************************/

describe('formatBytes', () => {
    context('正常系', () => {
        specify('0は0B', () => {
            formatBytes(0).should.equal('0B');
        });

        specify('1000未満はB', () => {
            formatBytes(999).should.equal('999B');
        });

        specify('1000でkBに上がる', () => {
            formatBytes(1000).should.equal('1kB');
        });

        specify('端数は有効数字3桁', () => {
            formatBytes(1500).should.equal('1.5kB');
            formatBytes(1048576).should.equal('1.05MB');
            formatBytes(123456789).should.equal('123MB');
        });

        specify('既定の設定値の表記', () => {
            formatBytes(2000000).should.equal('2MB');
            formatBytes(3000000000).should.equal('3GB');
        });

        specify('丸めで1000になるときは次の単位にする', () => {
            formatBytes(999999).should.equal('1MB');
        });
    });

    context('異常系', () => {
        specify('負の数はエラー', () => {
            (() => formatBytes(-1)).should.throw();
        });

        specify('数値でなければエラー', () => {
            (() => formatBytes('1000')).should.throw();
            (() => formatBytes(NaN)).should.throw();
        });
    });
});

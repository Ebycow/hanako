const should = require('chai').should();
const levenshteinDistance = require('../../src/core/utils/levenshtein_distance');

/************************************************************************
 * levenshteinDistance関数単体スペック
 *
 * 期待動作：2つの文字列間のレーベンシュタイン距離を返す
 * 備考：なし
 ***********************************************************************/

describe('levenshteinDistance', () => {
    context('正常系', () => {
        specify('同一文字列は距離0', () => {
            levenshteinDistance('hello', 'hello').should.equal(0);
        });

        specify('空文字列同士は距離0', () => {
            levenshteinDistance('', '').should.equal(0);
        });

        specify('片方が空文字列なら他方の長さを返す', () => {
            levenshteinDistance('', 'abc').should.equal(3);
            levenshteinDistance('abc', '').should.equal(3);
        });

        specify('1文字の置換は距離1', () => {
            levenshteinDistance('cat', 'bat').should.equal(1);
        });

        specify('1文字の挿入は距離1', () => {
            levenshteinDistance('cat', 'cats').should.equal(1);
        });

        specify('1文字の削除は距離1', () => {
            levenshteinDistance('cats', 'cat').should.equal(1);
        });

        specify('完全に異なる文字列は長い方の長さ', () => {
            levenshteinDistance('abc', 'xyz').should.equal(3);
        });

        specify('日本語文字列でも正しく計算する', () => {
            levenshteinDistance('花子', '花太').should.equal(1);
        });
    });
});

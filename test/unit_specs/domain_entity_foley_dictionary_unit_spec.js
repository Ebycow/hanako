const should = require('chai').should();
const { foleyDictionaryLineBlueprint, FoleyDictionary } = require('../helpers/blueprints');

/************************************************************************
 * FoleyDictionaryクラス単体スペック
 *
 * 期待動作：SE辞書エンティティの構築・ソート・ページャブル
 * 備考：linesはUnicode文字数の降順でソートされる
 ***********************************************************************/

describe('FoleyDictionary', () => {
    describe('構築', () => {
        specify('id, serverId, linesを正しく保持する', () => {
            const line = foleyDictionaryLineBlueprint();
            const fd = new FoleyDictionary({ id: 'fd-1', serverId: 'server-1', lines: [line] });
            fd.id.should.equal('fd-1');
            fd.serverId.should.equal('server-1');
            fd.lines.should.have.lengthOf(1);
        });

        specify('空のlines配列でも構築できる', () => {
            const fd = new FoleyDictionary({ id: 'fd-1', serverId: 'server-1', lines: [] });
            fd.lines.should.have.lengthOf(0);
        });

        specify('linesがUnicode文字数の降順でソートされる', () => {
            const short = foleyDictionaryLineBlueprint({ id: 'fdl-short', keyword: 'ドン' }); // 2文字
            const long = foleyDictionaryLineBlueprint({ id: 'fdl-long', keyword: 'ドンドンッ' }); // 4文字
            const mid = foleyDictionaryLineBlueprint({ id: 'fdl-mid', keyword: 'バシッ' }); // 3文字

            // わざと短い順に渡す
            const fd = new FoleyDictionary({ id: 'fd-1', serverId: 'server-1', lines: [short, mid, long] });

            // 降順：4文字 → 3文字 → 2文字
            fd.lines[0].keyword.should.equal('ドンドンッ');
            fd.lines[1].keyword.should.equal('バシッ');
            fd.lines[2].keyword.should.equal('ドン');
        });
    });

    describe('プロパティ', () => {
        specify('linesPerPageは5を返す', () => {
            const fd = new FoleyDictionary({ id: 'fd-1', serverId: 'server-1', lines: [] });
            fd.linesPerPage.should.equal(5);
        });

        specify('descriptorは所定の文字列を返す', () => {
            const fd = new FoleyDictionary({ id: 'fd-1', serverId: 'server-1', lines: [] });
            fd.descriptor.should.be.a('string').that.is.not.empty;
        });

        specify('linesゲッターはスライスコピーを返す', () => {
            const line = foleyDictionaryLineBlueprint();
            const fd = new FoleyDictionary({ id: 'fd-1', serverId: 'server-1', lines: [line] });

            const lines1 = fd.lines;
            const lines2 = fd.lines;
            lines1.should.not.equal(lines2); // 別の配列インスタンス
            lines1.should.deep.equal(lines2); // 内容は同一
        });
    });
});

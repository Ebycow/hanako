require('chai').should();
const HelpAutocompleteService = require('../../src/service/help_autocomplete_service');

/************************************************************************
 * HelpAutocompleteServiceクラス単体スペック
 *
 * 期待動作：入力中の文字列から help で指定するコマンド名の候補を作って返す
 * 備考：なし
 ***********************************************************************/

describe('HelpAutocompleteService', () => {
    specify('スラッシュコマンド名と説明を名前に、スラッシュコマンド名を値にする', () => {
        const choices = new HelpAutocompleteService().suggest('limit');

        choices.should.deep.include({
            name: '/limit 読み上げる文字数の上限を設定します',
            value: 'limit',
        });
    });

    specify('テキストでの名前でも候補になる', () => {
        const choices = new HelpAutocompleteService().suggest('教育');

        choices.map((c) => c.value).should.include('teach');
    });

    specify('空なら全てのコマンドを25件までで返す', () => {
        const choices = new HelpAutocompleteService().suggest('');

        choices.length.should.be.within(1, 25);
        choices.forEach((c) => {
            Array.from(c.name).length.should.be.at.most(100);
            c.value.length.should.be.at.most(100);
        });
    });

    specify('合うコマンドがなければ候補なし', () => {
        new HelpAutocompleteService().suggest('そんなコマンドはない').should.deep.equal([]);
    });
});

const should = require('chai').should();
const Commando = require('../../src/domain/model/commando');
const { basicHanako, commandInputBlueprint } = require('../helpers/blueprints');

/************************************************************************
 * Commandoクラス単体スペック
 *
 * メソッド：#resolve
 * 期待動作：コマンド名を解決してインスタンスを返す
 * 備考：なし
 ***********************************************************************/

describe('Commando', () => {
    describe('#resolve', () => {
        context('正常系', () => {
            specify('既知のコマンド名を解決する', () => {
                const commando = new Commando(basicHanako());
                const input = commandInputBlueprint({ argc: 1, argv: ['ask'] });
                const [cmd] = commando.resolve(input);

                should.not.equal(cmd, null);
                cmd.type.should.equal('ask');
            });

            specify('日本語コマンド名を解決する', () => {
                const commando = new Commando(basicHanako());
                const input = commandInputBlueprint({ argc: 1, argv: ['教育'] });
                const [cmd] = commando.resolve(input);

                should.not.equal(cmd, null);
                cmd.type.should.equal('word_create');
            });

            specify('コマンド名の引数が消費される', () => {
                const commando = new Commando(basicHanako());
                const input = commandInputBlueprint({ argc: 2, argv: ['ask', 'extra'] });
                const [cmd, consumedInput] = commando.resolve(input);

                should.not.equal(cmd, null);
                consumedInput.argc.should.equal(1);
            });

            specify('ハイフン付きコマンド名を解決する', () => {
                const commando = new Commando(basicHanako());
                const input = commandInputBlueprint({ argc: 2, argv: ['se', 'del'] });
                const [cmd] = commando.resolve(input);

                // se-del は FoleyDeleteCommand に対応
                should.not.equal(cmd, null);
            });
        });

        context('異常系', () => {
            specify('未知のコマンド名はnullを返す', () => {
                const commando = new Commando(basicHanako());
                const input = commandInputBlueprint({ argc: 1, argv: ['unknown_command'] });
                const [cmd, returnedInput] = commando.resolve(input);

                should.equal(cmd, null);
                returnedInput.should.equal(input);
            });
        });
    });
});

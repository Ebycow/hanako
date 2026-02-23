const should = require('chai').should();
const HelpCommand = require('../../src/domain/model/commands/help_command');
const { commandInputBlueprint } = require('../helpers/blueprints');

/************************************************************************
 * HelpCommandクラス単体スペック
 *
 * メソッド：#process
 * 期待動作：ヘルプメッセージの返却
 * 備考：なし
 ***********************************************************************/

describe('HelpCommand', () => {
    describe('Commandクラスメタスペック', () => {
        specify('typeは文字列を返す', () => {
            const sub = new HelpCommand();
            sub.type.should.be.a('string');
        });

        specify('namesは静的に文字列の配列を返す', () => {
            HelpCommand.names.should.be.an('array').that.is.not.empty;
            HelpCommand.names.forEach((name) => name.should.be.a('string'));
        });

        specify('processメソッドを持つ', () => {
            const sub = new HelpCommand();
            sub.process.should.be.a('function');
        });
    });

    describe('#process', () => {
        context('正常系', () => {
            specify('ヘルプURLを含む会話レスポンスを返す', () => {
                const input = commandInputBlueprint();
                const sub = new HelpCommand();
                const res = sub.process(input);

                res.type.should.equal('chat');
                res.code.should.equal('simple');
                res.content.should.include('https://');
            });
        });
    });
});

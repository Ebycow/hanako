const should = require('chai').should();
const WordCreateCommand = require('../../src/domain/model/commands/word_create_command');
const {
    basicHanako,
    commandInputBlueprint,
    wordDictionaryLineBlueprint,
    WordDictionary,
} = require('../helpers/blueprints');

/************************************************************************
 * WordCreateCommandクラス単体スペック
 *
 * メソッド：#process
 * 期待動作：教育単語追加アクションレスポンスの返却
 * 備考：なし
 ***********************************************************************/

describe('WordCreateCommand', () => {
    describe('Commandクラスメタスペック', () => {
        specify('typeは文字列を返す', () => {
            const sub = new WordCreateCommand(basicHanako());
            sub.type.should.be.a('string');
        });

        specify('namesは静的に文字列の配列を返す', () => {
            WordCreateCommand.names.should.be.an('array').that.is.not.empty;
            WordCreateCommand.names.forEach((name) => name.should.be.a('string'));
        });

        specify('processメソッドを持つ', () => {
            const sub = new WordCreateCommand(basicHanako());
            sub.process.should.be.a('function');
        });
    });

    describe('#process', () => {
        context('正常系', () => {
            specify('正しい教育アクションレスポンスを返す', () => {
                const input = commandInputBlueprint({ argc: 2, argv: ['花子', 'はなこ'] });
                const sub = new WordCreateCommand(basicHanako());
                const res = sub.process(input);

                res.type.should.equal('action');
                res.action.type.should.equal('word_create');
                res.action.from.should.equal('花子');
                res.action.to.should.equal('はなこ');
                res.onSuccess.content.should.include('花子');
                res.onSuccess.content.should.include('はなこ');
            });
        });

        context('異常系', () => {
            specify('引数が2つでないとエラー', () => {
                const input = commandInputBlueprint({ argc: 1, argv: ['花子'] });
                const sub = new WordCreateCommand(basicHanako());
                const res = sub.process(input);

                res.type.should.equal('chat');
                res.code.should.equal('error');
            });

            specify('1文字のfromはエラー', () => {
                const input = commandInputBlueprint({ argc: 2, argv: ['花', 'はな'] });
                const sub = new WordCreateCommand(basicHanako());
                const res = sub.process(input);

                res.type.should.equal('chat');
                res.code.should.equal('error');
            });

            specify('1文字のtoはエラー', () => {
                const input = commandInputBlueprint({ argc: 2, argv: ['花子', 'は'] });
                const sub = new WordCreateCommand(basicHanako());
                const res = sub.process(input);

                res.type.should.equal('chat');
                res.code.should.equal('error');
            });

            specify('50文字超のfromはエラー', () => {
                const longStr = 'あ'.repeat(51);
                const input = commandInputBlueprint({ argc: 2, argv: [longStr, 'はなこ'] });
                const sub = new WordCreateCommand(basicHanako());
                const res = sub.process(input);

                res.type.should.equal('chat');
                res.code.should.equal('error');
            });

            specify('重複する単語はエラー', () => {
                const line = wordDictionaryLineBlueprint({ from: '花子', to: 'はなこ' });
                const wd = new WordDictionary({ id: 'wd', serverId: 'mock-server-id', lines: [line] });
                const input = commandInputBlueprint({ argc: 2, argv: ['花子', 'ハナコ'] });
                const sub = new WordCreateCommand(basicHanako({ wordDictionary: wd }));
                const res = sub.process(input);

                res.type.should.equal('chat');
                res.code.should.equal('error');
                res.content.should.include('教育済み');
            });

            specify('上限200件に達しているとエラー', () => {
                const lines = [];
                for (let i = 0; i < 200; i++) {
                    lines.push(wordDictionaryLineBlueprint({ id: `wdl-${i}`, from: `単語${i}あ`, to: `よみ${i}あ` }));
                }
                const wd = new WordDictionary({ id: 'wd', serverId: 'mock-server-id', lines });
                const input = commandInputBlueprint({ argc: 2, argv: ['新語あ', 'しんごあ'] });
                const sub = new WordCreateCommand(basicHanako({ wordDictionary: wd }));
                const res = sub.process(input);

                res.type.should.equal('chat');
                res.code.should.equal('error');
                res.content.should.include('上限');
            });
        });
    });
});

const should = require('chai').should();
const HelpCommand = require('../../src/domain/model/commands/help_command');
const LimitCommand = require('../../src/domain/model/commands/limit_command');
const TextCommandsCommand = require('../../src/domain/model/commands/text_commands_command');
const { basicHanako, commandInputBlueprint, processText } = require('../helpers/blueprints');

/************************************************************************
 * HelpCommandクラス単体スペック
 *
 * メソッド：#process
 * 期待動作：コマンド一覧、またはコマンドごとの使い方の返却
 * 備考：なし
 ***********************************************************************/

describe('HelpCommand', () => {
    describe('Commandクラスメタスペック', () => {
        specify('typeは文字列を返す', () => {
            const sub = new HelpCommand(basicHanako());
            sub.type.should.be.a('string');
        });

        specify('namesは静的に文字列の配列を返す', () => {
            HelpCommand.names.should.be.an('array').that.is.not.empty;
            HelpCommand.names.forEach((name) => name.should.be.a('string'));
        });

        specify('processメソッドを持つ', () => {
            const sub = new HelpCommand(basicHanako());
            sub.process.should.be.a('function');
        });
    });

    describe('.findCommand', () => {
        specify('スラッシュコマンド名で探せる', () => {
            HelpCommand.findCommand('limit').should.equal(LimitCommand);
        });

        specify('テキストでの名前や別名でも探せる', () => {
            HelpCommand.findCommand('制限').should.equal(LimitCommand);
            HelpCommand.findCommand('readlimit').should.equal(LimitCommand);
        });

        specify('先頭の「/」や「>」と大文字小文字は無視する', () => {
            HelpCommand.findCommand('/limit').should.equal(LimitCommand);
            HelpCommand.findCommand('>LIMIT').should.equal(LimitCommand);
        });

        specify('見つからなければnull', () => {
            should.not.exist(HelpCommand.findCommand('nothing'));
        });
    });

    describe('#process', () => {
        context('コマンドを指定しないとき', () => {
            specify('コマンド一覧と使い方のページのURLを返す', () => {
                const input = commandInputBlueprint();
                const res = processText(new HelpCommand(basicHanako()), input);

                res.type.should.equal('chat');
                res.code.should.equal('simple');
                res.content.should.include('`/limit` 読み上げる文字数の上限を設定します');
                res.content.should.include('`/help` コマンド一覧と使い方を表示します');
                res.content.should.include('<https://example.com/help>');
            });

            specify('権限が必要なコマンドにはその権限を付ける', () => {
                const input = commandInputBlueprint();
                const res = processText(new HelpCommand(basicHanako()), input);

                res.content.should.include('`/limit` 読み上げる文字数の上限を設定します :lock:サーバー管理');
            });

            specify('入力元に合わせて、使い方の見方を案内する', () => {
                const text = processText(new HelpCommand(basicHanako()), commandInputBlueprint());
                text.content.should.include('`@hanako help コマンド名`');

                const slashInput = commandInputBlueprint({ args: {} }, { type: 'interaction' });
                const slash = new HelpCommand(basicHanako()).process(slashInput);
                slash.content.should.include('`/help command:コマンド名`');
            });

            specify('使い方のページのURLが空なら案内しない', () => {
                const hanako = basicHanako({ serverStatus: { helpUrl: '' } });
                const res = processText(new HelpCommand(hanako), commandInputBlueprint());

                res.content.should.not.include('詳しくはこちら');
            });
        });

        context('コマンドを指定したとき', () => {
            specify('説明・オプション・使える人・テキストでの書き方を返す', () => {
                const input = commandInputBlueprint({ argc: 1, argv: ['制限'] });
                const res = processText(new HelpCommand(basicHanako()), input);

                res.type.should.equal('chat');
                res.code.should.equal('simple');
                res.content.should.include('**/limit** 読み上げる文字数の上限を設定します');
                res.content.should.include('・`number` 文字数の上限（例: 30）');
                res.content.should.include('使える人: 「サーバー管理」の権限を持っている人');
                res.content.should.include('`@hanako 制限` `>制限`（別名: limit, readlimit）');
                res.content.should.include('<https://example.com/help>');
            });

            specify('省略できるオプションにはそれを書く', () => {
                const input = commandInputBlueprint({ argc: 1, argv: ['help'] });
                const res = processText(new HelpCommand(basicHanako()), input);

                res.content.should.include('・`command` 使い方を知りたいコマンド（例: limit）（省略可）');
                res.content.should.include('使える人: 全員');
            });

            specify('空白で区切られた名前は「-」でつないで探す', () => {
                const input = commandInputBlueprint({ argc: 2, argv: ['se', 'add'] });
                const res = processText(new HelpCommand(basicHanako()), input);

                res.content.should.include('**/se-add**');
            });

            specify('スラッシュコマンドでも同じ使い方を返す', () => {
                const input = commandInputBlueprint({ args: { command: 'limit' } }, { type: 'interaction' });
                const res = new HelpCommand(basicHanako()).process(input);

                res.content.should.include('**/limit**');
            });

            specify('テキストコマンドを無効にしているサーバーでは、テキストでの書き方を出さない', () => {
                const hanako = basicHanako({ settings: { textCommands: false } });
                const input = commandInputBlueprint({ args: { command: 'limit' } }, { type: 'interaction' });
                const res = new HelpCommand(hanako).process(input);

                res.content.should.not.include('テキストでの書き方');
            });

            specify('スラッシュコマンドだけのコマンドはそれを書く', () => {
                const input = commandInputBlueprint(
                    { args: { command: TextCommandsCommand.slash.name } },
                    { type: 'interaction' }
                );
                const res = new HelpCommand(basicHanako()).process(input);

                res.content.should.include('テキストでの書き方: なし（スラッシュコマンドのみ）');
            });
        });

        context('異常系', () => {
            specify('見つからないコマンドならエラーを返す', () => {
                const input = commandInputBlueprint({ argc: 1, argv: ['nothing'] });
                const res = processText(new HelpCommand(basicHanako()), input);

                res.type.should.equal('chat');
                res.code.should.equal('error');
                res.content.should.include('「nothing」というコマンドは見つからなかったよ');
                res.content.should.include('`@hanako help`');
            });
        });
    });
});

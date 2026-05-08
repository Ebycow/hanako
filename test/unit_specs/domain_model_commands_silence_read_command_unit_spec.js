const should = require('chai').should();
const SilenceReadCommand = require('../../src/domain/model/commands/slience_read_command');
const {
    basicHanako,
    commandInputBlueprint,
    silenceDictionaryLineBlueprint,
    SilenceDictionary,
} = require('../helpers/blueprints');

/************************************************************************
 * SilenceReadCommandクラス単体スペック
 *
 * メソッド：#process
 * 期待動作：沈黙ユーザー一覧ページャーレスポンスの返却
 * 備考：ファイル名はslience_read_command.js（タイポ）
 ***********************************************************************/

describe('SilenceReadCommand', () => {
    describe('Commandクラスメタスペック', () => {
        specify('typeは文字列を返す', () => {
            const sub = new SilenceReadCommand(basicHanako());
            sub.type.should.be.a('string');
        });

        specify('namesは静的に文字列の配列を返す', () => {
            SilenceReadCommand.names.should.be.an('array').that.is.not.empty;
            SilenceReadCommand.names.forEach((name) => name.should.be.a('string'));
        });

        specify('processメソッドを持つ', () => {
            const sub = new SilenceReadCommand(basicHanako());
            sub.process.should.be.a('function');
        });
    });

    describe('#process', () => {
        context('正常系', () => {
            specify('沈黙ユーザーがいればページャーレスポンスを返す', () => {
                const line = silenceDictionaryLineBlueprint({ userId: 'user-001' });
                const sd = new SilenceDictionary({ id: 'sd', serverId: 'mock-server-id', lines: [line] });
                const input = commandInputBlueprint();
                const sub = new SilenceReadCommand(basicHanako({ silenceDictionary: sd }));
                const res = sub.process(input);

                res.type.should.equal('chat');
                res.code.should.equal('pager');
            });
        });

        context('異常系', () => {
            specify('沈黙ユーザーがいなければエラーレスポンスを返す', () => {
                const input = commandInputBlueprint();
                const sub = new SilenceReadCommand(basicHanako());
                const res = sub.process(input);

                res.type.should.equal('chat');
                res.code.should.equal('error');
            });
        });
    });
});

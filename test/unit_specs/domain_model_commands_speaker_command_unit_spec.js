const should = require('chai').should();
const SpeakerCommand = require('../../src/domain/model/commands/speaker_command');
const { basicHanako, commandInputBlueprint } = require('../helpers/blueprints');

/************************************************************************
 * SpeakerCommandクラス単体スペック
 *
 * メソッド：#process
 * 期待動作：キャラクター変更アクションレスポンスの返却
 * 備考：なし
 ***********************************************************************/

describe('SpeakerCommand', () => {
    describe('Commandクラスメタスペック', () => {
        specify('typeは文字列を返す', () => {
            const sub = new SpeakerCommand(basicHanako());
            sub.type.should.be.a('string');
        });

        specify('namesは静的に文字列の配列を返す', () => {
            SpeakerCommand.names.should.be.an('array').that.is.not.empty;
            SpeakerCommand.names.forEach((name) => name.should.be.a('string'));
        });

        specify('processメソッドを持つ', () => {
            const sub = new SpeakerCommand(basicHanako());
            sub.process.should.be.a('function');
        });
    });

    describe('#process', () => {
        context('正常系', () => {
            specify('有効なスピーカー名でアクションレスポンスを返す', () => {
                const input = commandInputBlueprint({ argc: 1, argv: ['kiritan'] });
                const sub = new SpeakerCommand(basicHanako());
                const res = sub.process(input);

                res.type.should.equal('action');
                res.action.type.should.equal('speaker_update');
                res.action.speaker.should.equal('kiritan');
                res.onSuccess.content.should.include('kiritan');
            });

            specify('defaultを指定するとデフォルト戻しメッセージを返す', () => {
                const input = commandInputBlueprint({ argc: 1, argv: ['default'] });
                const sub = new SpeakerCommand(basicHanako());
                const res = sub.process(input);

                res.type.should.equal('action');
                res.onSuccess.content.should.include('デフォルト');
            });
        });

        context('異常系', () => {
            specify('引数なしはエラー', () => {
                const input = commandInputBlueprint({ argc: 0, argv: [] });
                const sub = new SpeakerCommand(basicHanako());
                const res = sub.process(input);

                res.type.should.equal('chat');
                res.code.should.equal('error');
            });

            specify('引数が2つ以上はエラー', () => {
                const input = commandInputBlueprint({ argc: 2, argv: ['a', 'b'] });
                const sub = new SpeakerCommand(basicHanako());
                const res = sub.process(input);

                res.type.should.equal('chat');
                res.code.should.equal('error');
            });
        });
    });
});

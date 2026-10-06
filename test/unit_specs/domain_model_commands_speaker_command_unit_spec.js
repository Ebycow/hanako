const should = require('chai').should();
const SpeakerCommand = require('../../src/domain/model/commands/speaker_command');
const { basicHanako, commandInputBlueprint, processText } = require('../helpers/blueprints');

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
            specify('入力した名前でアクションレスポンスを返す', () => {
                const input = commandInputBlueprint({ argc: 1, argv: ['kiritan'] });
                const sub = new SpeakerCommand(basicHanako());
                const res = processText(sub, input);

                res.type.should.equal('action');
                res.action.type.should.equal('speaker_update');
                res.action.speaker.should.equal('kiritan');
                res.onFailure.code.should.equal('error');
            });

            specify('空白を含む名前はつなげて1つの名前にする', () => {
                const input = commandInputBlueprint({ argc: 2, argv: ['ずんだもん', 'あまあま'] });
                const res = processText(new SpeakerCommand(basicHanako()), input);

                res.action.speaker.should.equal('ずんだもん あまあま');
            });

            specify('成功時は照合した話者の表示名・指定・クレジットを伝える', () => {
                const input = commandInputBlueprint({ argc: 1, argv: ['ずんだもん'] });
                const res = processText(new SpeakerCommand(basicHanako()), input);
                const chat = res.successResponse({
                    address: 'voicevox:ずんだもん/ノーマル',
                    displayName: 'ずんだもん（ノーマル）',
                    engine: 'voicevox',
                    credit: 'VOICEVOX:ずんだもん',
                });

                chat.content.should.include('ずんだもん（ノーマル）（voicevox:ずんだもん/ノーマル）');
                chat.content.should.include('音声: VOICEVOX:ずんだもん');
            });

            specify('表示名が指定と同じなら1回だけ書き、クレジットがなければ書かない', () => {
                const input = commandInputBlueprint({ argc: 1, argv: ['kiritan'] });
                const res = processText(new SpeakerCommand(basicHanako()), input);
                const chat = res.successResponse({
                    address: 'kiritan',
                    displayName: 'kiritan',
                    engine: null,
                    credit: null,
                });

                chat.content.should.include('キャラクターをkiritanに変更');
                chat.content.should.not.include('音声:');
            });

            specify('defaultに戻したときはデフォルト戻しメッセージを返す', () => {
                const input = commandInputBlueprint({ argc: 1, argv: ['default'] });
                const res = processText(new SpeakerCommand(basicHanako()), input);
                const chat = res.successResponse({
                    address: 'default',
                    displayName: 'デフォルト',
                    engine: null,
                    credit: null,
                });

                chat.content.should.include('デフォルト');
            });

            specify('スラッシュコマンドの名前は入力中に候補を出す', () => {
                SpeakerCommand.slash.options[0].autocomplete.should.be.true;
            });
        });

        context('異常系', () => {
            specify('引数なしはエラー', () => {
                const input = commandInputBlueprint({ argc: 0, argv: [] });
                const sub = new SpeakerCommand(basicHanako());
                const res = processText(sub, input);

                res.type.should.equal('chat');
                res.code.should.equal('error');
            });
        });
    });
});

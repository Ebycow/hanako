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

            specify('利用規約の URL があればクレジットにリンクを添える（プレビューは出さない）', () => {
                const input = commandInputBlueprint({ argc: 1, argv: ['もち子'] });
                const res = processText(new SpeakerCommand(basicHanako()), input);
                const chat = res.successResponse({
                    address: 'voicevox:もち子さん/ノーマル',
                    displayName: 'もち子さん（ノーマル）',
                    engine: 'voicevox',
                    credit: 'VOICEVOX:もち子(cv 明日葉よもぎ)',
                    termsUrl: 'https://vtubermochio.wixsite.com/mochizora/利用規約',
                });

                chat.content.should.include(
                    '音声: VOICEVOX:もち子(cv 明日葉よもぎ)（[利用規約](<https://vtubermochio.wixsite.com/mochizora/%E5%88%A9%E7%94%A8%E8%A6%8F%E7%B4%84>)）'
                );
            });

            specify('日本語のドメインは Discord が開ける形にする', () => {
                const input = commandInputBlueprint({ argc: 1, argv: ['後鬼'] });
                const res = processText(new SpeakerCommand(basicHanako()), input);
                const chat = res.successResponse({
                    address: 'voicevox:後鬼/人間ver.',
                    displayName: '後鬼（人間ver.）',
                    engine: 'voicevox',
                    credit: 'VOICEVOX:後鬼',
                    termsUrl: 'https://ついなちゃん.com/voicevox_terms/',
                });

                chat.content.should.include('(<https://xn--');
            });

            specify('クレジットがなく利用規約だけあれば、利用規約のリンクだけ書く', () => {
                const input = commandInputBlueprint({ argc: 1, argv: ['阿井田'] });
                const res = processText(new SpeakerCommand(basicHanako()), input);
                const chat = res.successResponse({
                    address: 'aivis-cloud:阿井田茂/ノーマル',
                    displayName: '阿井田 茂（ノーマル）',
                    engine: 'aivis-cloud',
                    credit: null,
                    termsUrl: 'https://hub.aivis-project.com/aivm-models/47e53151',
                });

                chat.content.should.include('音声の[利用規約](<https://hub.aivis-project.com/aivm-models/47e53151>)');
                chat.content.should.not.include('音声:');
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

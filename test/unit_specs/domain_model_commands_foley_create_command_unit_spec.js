const should = require('chai').should();
const FoleyCreate = require('../../src/domain/model/commands/foley_create_command');
const {
    basicHanako,
    commandInputBlueprint,
    foleyDictionaryLineBlueprint,
    FoleyDictionary,
} = require('../helpers/blueprints');

/************************************************************************
 * FoleyCreateCommandクラス単体スペック
 *
 * メソッド：#process
 * 期待動作：SE追加アクションレスポンスの返却
 * 前提条件：入力の文字数が２より大きいこと
 *          ∧ 文字数が５０以下であること
 *          ∧ 出力音声に対応するリソース文字列のコードポイント数が３００以内のこと
 *          ∧ 出力音声に対応するリソース文字列が一般的なURL形式を満たしているか
 *          ∧ 既に当該キーワードが登録されていない
 *          ∧ 既に上限数（10000登録）をこえてしまっていない
 * 備考：URL指定方式と添付ファイル方式の2モードあり
 ***********************************************************************/

describe('FoleyCreateCommand', () => {
    describe('Commandクラスメタスペック', () => {
        specify('typeは文字列を返す', () => {
            const sub = new FoleyCreate();
            sub.type.should.be.a('string');
        });

        specify('namesは静的に文字列の配列を返す', () => {
            FoleyCreate.names.should.be.an('array').that.is.not.empty;
            FoleyCreate.names.forEach((name) => name.should.be.a('string'));
        });

        specify('processメソッドを持つ', () => {
            const sub = new FoleyCreate();
            sub.process.should.be.a('function');
        });
    });

    describe('#process', () => {
        context('正常系 - URL指定方式', () => {
            specify('正しいSE追加アクションレスポンスを返す', () => {
                const input = commandInputBlueprint({ argc: 2, argv: ['hello', 'http://example.com/se.mp3'] });
                const sub = new FoleyCreate(basicHanako());
                const res = sub.process(input);

                res.type.should.equal('action');
                res.action.type.should.equal('foley_create');
                res.action.keyword.should.equal('hello');
                res.action.url.should.equal('http://example.com/se.mp3');
                res.onSuccess.code.should.equal('simple');
                res.onFailure.code.should.equal('error');
            });
        });

        context('正常系 - 添付ファイル方式', () => {
            specify('1ファイル+0引数 → foley_create_multipleアクション', () => {
                const attachments = [{ name: 'ドンッ.wav', url: 'http://cdn.example.com/don.wav' }];
                const input = commandInputBlueprint({ argc: 0, argv: [] }, { attachments });
                const sub = new FoleyCreate(basicHanako());
                const res = sub.process(input);

                res.type.should.equal('action');
                res.action.type.should.equal('foley_create_multiple');
                res.action.items.should.have.lengthOf(1);
                res.action.items[0].keyword.should.equal('ドンッ'); // 拡張子除去
            });

            specify('1ファイル+1引数(SE名) → foley_createアクション', () => {
                const attachments = [{ name: 'audio.wav', url: 'http://cdn.example.com/audio.wav' }];
                const input = commandInputBlueprint({ argc: 1, argv: ['カスタム名'] }, { attachments });
                const sub = new FoleyCreate(basicHanako());
                const res = sub.process(input);

                res.type.should.equal('action');
                res.action.type.should.equal('foley_create');
                res.action.keyword.should.equal('カスタム名');
            });

            specify('複数ファイル+0引数 → foley_create_multipleアクション', () => {
                const attachments = [
                    { name: 'ドンッ.wav', url: 'http://cdn.example.com/don.wav' },
                    { name: 'バシッ.mp3', url: 'http://cdn.example.com/bashi.mp3' },
                ];
                const input = commandInputBlueprint({ argc: 0, argv: [] }, { attachments });
                const sub = new FoleyCreate(basicHanako());
                const res = sub.process(input);

                res.type.should.equal('action');
                res.action.type.should.equal('foley_create_multiple');
                res.action.items.should.have.lengthOf(2);
            });
        });

        context('異常系 - 引数不正', () => {
            specify('0ファイル+0引数 → エラー', () => {
                const input = commandInputBlueprint({ argc: 0, argv: [] });
                const sub = new FoleyCreate(basicHanako());
                const res = sub.process(input);

                res.type.should.equal('chat');
                res.code.should.equal('error');
            });

            specify('0ファイル+1引数 → エラー', () => {
                const input = commandInputBlueprint({ argc: 1, argv: ['hello'] });
                const sub = new FoleyCreate(basicHanako());
                const res = sub.process(input);

                res.type.should.equal('chat');
                res.code.should.equal('error');
            });

            specify('0ファイル+3引数 → エラー', () => {
                const input = commandInputBlueprint({ argc: 3, argv: ['a', 'b', 'c'] });
                const sub = new FoleyCreate(basicHanako());
                const res = sub.process(input);

                res.type.should.equal('chat');
                res.code.should.equal('error');
            });

            specify('複数ファイル+1引数 → エラー', () => {
                const attachments = [
                    { name: 'a.wav', url: 'http://cdn.example.com/a.wav' },
                    { name: 'b.wav', url: 'http://cdn.example.com/b.wav' },
                ];
                const input = commandInputBlueprint({ argc: 1, argv: ['SE名'] }, { attachments });
                const sub = new FoleyCreate(basicHanako());
                const res = sub.process(input);

                res.type.should.equal('chat');
                res.code.should.equal('error');
            });

            specify('添付ファイル+2引数以上 → エラー', () => {
                const attachments = [{ name: 'a.wav', url: 'http://cdn.example.com/a.wav' }];
                const input = commandInputBlueprint({ argc: 2, argv: ['a', 'b'] }, { attachments });
                const sub = new FoleyCreate(basicHanako());
                const res = sub.process(input);

                res.type.should.equal('chat');
                res.code.should.equal('error');
            });
        });

        context('異常系 - バリデーション', () => {
            specify('1文字キーワード → エラー', () => {
                const input = commandInputBlueprint({ argc: 2, argv: ['あ', 'http://example.com/se.mp3'] });
                const sub = new FoleyCreate(basicHanako());
                const res = sub.process(input);

                res.type.should.equal('chat');
                res.code.should.equal('error');
            });

            specify('50文字以上キーワード → エラー', () => {
                const longKeyword = 'あ'.repeat(50);
                const input = commandInputBlueprint({ argc: 2, argv: [longKeyword, 'http://example.com/se.mp3'] });
                const sub = new FoleyCreate(basicHanako());
                const res = sub.process(input);

                res.type.should.equal('chat');
                res.code.should.equal('error');
            });

            specify('URL300文字超 → エラー', () => {
                const longUrl = 'http://example.com/' + 'a'.repeat(300);
                const input = commandInputBlueprint({ argc: 2, argv: ['テスト', longUrl] });
                const sub = new FoleyCreate(basicHanako());
                const res = sub.process(input);

                res.type.should.equal('chat');
                res.code.should.equal('error');
            });

            specify('不正URL形式 → エラー', () => {
                const input = commandInputBlueprint({ argc: 2, argv: ['テスト', 'これはURLではない'] });
                const sub = new FoleyCreate(basicHanako());
                const res = sub.process(input);

                res.type.should.equal('chat');
                res.code.should.equal('error');
            });
        });

        context('異常系 - 重複・上限', () => {
            specify('既存キーワードと重複 → エラー', () => {
                const line = foleyDictionaryLineBlueprint({ keyword: 'hello' });
                const fd = new FoleyDictionary({ id: 'fd', serverId: 'mock-server-id', lines: [line] });
                const input = commandInputBlueprint({ argc: 2, argv: ['hello', 'http://example.com/se.mp3'] });
                const sub = new FoleyCreate(basicHanako({ foleyDictionary: fd }));
                const res = sub.process(input);

                res.type.should.equal('chat');
                res.code.should.equal('error');
            });

            specify('10000件登録済み → エラー', () => {
                const lines = Array.from({ length: 10000 }, (_, i) =>
                    foleyDictionaryLineBlueprint({ id: `fdl-${i}`, keyword: `kw${i}` })
                );
                const fd = new FoleyDictionary({ id: 'fd', serverId: 'mock-server-id', lines });
                const input = commandInputBlueprint({ argc: 2, argv: ['新規SE', 'http://example.com/se.mp3'] });
                const sub = new FoleyCreate(basicHanako({ foleyDictionary: fd }));
                const res = sub.process(input);

                res.type.should.equal('chat');
                res.code.should.equal('error');
            });
        });
    });
});

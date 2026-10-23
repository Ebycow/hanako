require('chai').should();
const sinon = require('sinon');
const SpeakersCommand = require('../../src/domain/model/commands/speakers_command');
const VoiceCatalog = require('../../src/domain/entity/voice_catalog');
const PagerBuilder = require('../../src/service/pager_builder');
const { basicHanako, commandInputBlueprint, processText } = require('../helpers/blueprints');

/************************************************************************
 * SpeakersCommandクラス・VoiceCatalogエンティティ単体スペック
 *
 * 期待動作：読み上げキャラクターの一覧を読み込み、キャラごとに1行でページ送りで返す
 * 備考：なし
 ***********************************************************************/

function character(address, styles, overrides = {}) {
    return Object.assign({ address, name: null, styles, available: true }, overrides);
}

function sampleCatalog() {
    return new VoiceCatalog({
        characters: [
            character('ebyroid:kiritan', []),
            character('voicevox:ずんだもん', ['ノーマル', 'あまあま']),
            character('voicevox:小夜-sayo', ['ノーマル'], { name: '小夜/SAYO' }),
        ],
        named: [{ name: 'preset:早口ずんだもん', target: 'voicevox:ずんだもん?speed=1.4' }],
    });
}

describe('VoiceCatalog', () => {
    specify('キャラごとに1行でスタイルを並べ、最後に別名・プリセットを置く', () => {
        sampleCatalog()
            .lines.map((l) => l.line)
            .should.deep.equal([
                '`ebyroid:kiritan`',
                '`voicevox:ずんだもん` ノーマル / あまあま',
                '`voicevox:小夜-sayo`（小夜/SAYO） ノーマル',
                '`preset:早口ずんだもん` → voicevox:ずんだもん?speed=1.4',
            ]);
    });

    specify('エンジンが止まっているキャラには停止中と書く', () => {
        new VoiceCatalog({
            characters: [character('voicevox:ずんだもん', ['ノーマル'], { available: false })],
            named: [],
        }).lines
            .map((l) => l.line)
            .should.deep.equal(['`voicevox:ずんだもん` ノーマル （停止中）']);
    });

    specify('ページ送りのディスクリプタは speakers', () => {
        sampleCatalog().descriptor.should.equal('speakers');
        VoiceCatalog.descriptor.should.equal('speakers');
    });
});

describe('SpeakersCommand', () => {
    const input = () => commandInputBlueprint({ argc: 0, argv: [] });

    specify('一覧を読み込むアクションを返す', () => {
        const res = processText(new SpeakersCommand(basicHanako()), input());

        res.type.should.equal('action');
        res.action.type.should.equal('voice_catalog_load');
        res.onFailure.code.should.equal('error');
    });

    specify('読み込んだ一覧をページ送りで返し、変更のしかたを添える', () => {
        const res = processText(new SpeakersCommand(basicHanako()), input());
        const chat = res.successResponse(sampleCatalog());

        chat.type.should.equal('chat');
        chat.code.should.equal('pager');
        chat.content.should.match(/^speakers 1 \/ 1 page/);
        chat.content.should.include('`voicevox:ずんだもん` ノーマル / あまあま');
        chat.content.should.include('変更するには');
    });

    specify('一覧が空なら、表示できないことを伝える', () => {
        const res = processText(new SpeakersCommand(basicHanako()), input());
        const chat = res.successResponse(new VoiceCatalog({ characters: [], named: [] }));

        chat.code.should.equal('error');
    });

    specify('ページ送りのボタンでは、一覧を読み込み直して復元する', async () => {
        const catalog = sampleCatalog();
        const repo = { loadVoiceCatalog: sinon.stub().resolves(catalog) };
        const pager = await new PagerBuilder(repo).build(basicHanako(), 'speakers 1 / 1 page');

        sinon.assert.calledOnce(repo.loadVoiceCatalog);
        pager.pageable.should.equal(catalog);
    });
});

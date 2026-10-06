require('chai').should();
const SpeakersCommand = require('../../src/domain/model/commands/speakers_command');
const VoiceCatalog = require('../../src/domain/entity/voice_catalog');
const Hanako = require('../../src/domain/model/hanako');
const PagerBuilder = require('../../src/service/pager_builder');
const { basicHanako, commandInputBlueprint, processText } = require('../helpers/blueprints');

/************************************************************************
 * SpeakersCommandクラス・VoiceCatalogエンティティ単体スペック
 *
 * 期待動作：読み上げキャラクターの一覧をキャラごとにまとめてページ送りで返す
 * 備考：なし
 ***********************************************************************/

function voice(address, character, style, engine = 'voicevox') {
    return { address, displayName: address, engine, credit: null, character, style };
}

function sampleCatalog() {
    return new VoiceCatalog({
        available: true,
        voices: [
            voice('ebyroid:kiritan', 'kiritan', null, 'ebyroid'),
            voice('voicevox:ずんだもん/ノーマル', 'ずんだもん', 'ノーマル'),
            voice('voicevox:ずんだもん/あまあま', 'ずんだもん', 'あまあま'),
            voice('voicevox:小夜-sayo/ノーマル', '小夜/SAYO', 'ノーマル'),
        ],
        named: [{ name: 'preset:早口ずんだもん', target: 'voicevox:ずんだもん?speed=1.4' }],
    });
}

/** 一覧を持たせた花子 */
function hanakoWith(catalog) {
    const h = basicHanako();
    return new Hanako(
        h.settings,
        h.serverStatus,
        h.voiceStatus,
        h.wordDictionary,
        h.silenceDictionary,
        h.foleyDictionary,
        catalog
    );
}

describe('VoiceCatalog', () => {
    specify('キャラごとに1行にまとめ、スタイルを並べ、最後に別名・プリセットを置く', () => {
        sampleCatalog()
            .lines.map((l) => l.line)
            .should.deep.equal([
                '`ebyroid:kiritan`',
                '`voicevox:ずんだもん` ノーマル / あまあま',
                '`voicevox:小夜-sayo`（小夜/SAYO） ノーマル',
                '`preset:早口ずんだもん` → voicevox:ずんだもん?speed=1.4',
            ]);
    });

    specify('エンジンが止まっているキャラには停止中と書き、一覧からは外さない', () => {
        const stopped = (address, character, style) =>
            Object.assign(voice(address, character, style), { available: false });
        new VoiceCatalog({
            available: true,
            voices: [
                voice('ebyroid:kiritan', 'kiritan', null, 'ebyroid'),
                stopped('voicevox:ずんだもん/ノーマル', 'ずんだもん', 'ノーマル'),
                stopped('voicevox:ずんだもん/あまあま', 'ずんだもん', 'あまあま'),
            ],
            named: [],
        }).lines
            .map((l) => l.line)
            .should.deep.equal(['`ebyroid:kiritan`', '`voicevox:ずんだもん` ノーマル / あまあま （停止中）']);
    });

    specify('ページ送りのディスクリプタは speakers', () => {
        sampleCatalog().descriptor.should.equal('speakers');
        VoiceCatalog.unavailable().available.should.be.false;
    });
});

describe('SpeakersCommand', () => {
    specify('一覧をページ送りで返し、変更のしかたを添える', () => {
        const input = commandInputBlueprint({ argc: 0, argv: [] });
        const res = processText(new SpeakersCommand(hanakoWith(sampleCatalog())), input);

        res.type.should.equal('chat');
        res.code.should.equal('pager');
        res.content.should.match(/^speakers 1 \/ 1 page/);
        res.content.should.include('`voicevox:ずんだもん` ノーマル / あまあま');
        res.content.should.include('変更するには');
    });

    specify('ページ送りのボタンで、花子の一覧から復元できる', async () => {
        const hanako = hanakoWith(sampleCatalog());
        const pager = await new PagerBuilder().build(hanako, 'speakers 1 / 1 page');
        pager.pageable.should.equal(hanako.voiceCatalog);
    });

    specify('一覧を取得できないときは、表示できないことを伝える', () => {
        const input = commandInputBlueprint({ argc: 0, argv: [] });
        for (const hanako of [hanakoWith(VoiceCatalog.unavailable()), basicHanako()]) {
            const res = processText(new SpeakersCommand(hanako), input);
            res.type.should.equal('chat');
            res.code.should.equal('error');
        }
    });
});

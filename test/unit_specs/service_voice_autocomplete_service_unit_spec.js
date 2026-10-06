require('chai').should();
const sinon = require('sinon');
const VoiceAutocompleteService = require('../../src/service/voice_autocomplete_service');
const AutocompleteCtrl = require('../../src/app/autocomplete_ctrl');

/************************************************************************
 * VoiceAutocompleteServiceクラス・AutocompleteCtrlクラス単体スペック
 *
 * 期待動作：入力中の文字列から読み上げキャラクターの候補を作って返す
 * 備考：話者一覧のリポジトリと Discord のインタラクションは sinon で差し替え
 ***********************************************************************/

const zundamon = {
    address: 'voicevox:ずんだもん/ノーマル',
    displayName: 'ずんだもん（ノーマル）',
    engine: 'voicevox',
    credit: 'VOICEVOX:ずんだもん',
};

describe('VoiceAutocompleteService', () => {
    specify('話者の表示名とエンジンを名前に、指定を値にする', async () => {
        const repo = { searchVoices: sinon.stub().resolves([zundamon]) };
        const choices = await new VoiceAutocompleteService(repo).suggest(' ずんだ ');

        sinon.assert.calledOnceWithExactly(repo.searchVoices, 'ずんだ', 25);
        choices.should.deep.equal([
            { name: 'ずんだもん（ノーマル） [voicevox]', value: 'voicevox:ずんだもん/ノーマル' },
        ]);
    });

    specify('入力は分解せずにリポジトリへ渡す（パラメータの扱いはリポジトリに任せる）', async () => {
        const repo = { searchVoices: sinon.stub().resolves([]) };
        await new VoiceAutocompleteService(repo).suggest('ずんだ?speed=1.4');

        sinon.assert.calledOnceWithExactly(repo.searchVoices, 'ずんだ?speed=1.4', 25);
    });

    specify('100文字を超える値の候補は除き、長い名前は切り詰める', async () => {
        const long = { address: 'x'.repeat(101), displayName: 'x', engine: null, credit: null };
        const longName = { address: 'ok', displayName: 'あ'.repeat(150), engine: null, credit: null };
        const repo = { searchVoices: sinon.stub().resolves([long, longName]) };
        const choices = await new VoiceAutocompleteService(repo).suggest('');

        choices.length.should.equal(1);
        choices[0].value.should.equal('ok');
        Array.from(choices[0].name).length.should.equal(100);
    });
});

describe('AutocompleteCtrl', () => {
    function autocompleteInteraction(commandName, focused) {
        return {
            commandName,
            isAutocomplete: () => true,
            options: { getFocused: () => focused },
            respond: sinon.stub().resolves(),
        };
    }

    function ctrlWith(suggest) {
        const ctrl = Object.create(AutocompleteCtrl.prototype);
        ctrl.voiceService = { suggest };
        return ctrl;
    }

    specify('speaker の name なら候補を返す', async () => {
        const choices = [{ name: 'ずんだもん', value: 'voicevox:ずんだもん/ノーマル' }];
        const ctrl = ctrlWith(sinon.stub().resolves(choices));
        const interaction = autocompleteInteraction('speaker', { name: 'name', value: 'ずん' });

        await ctrl.onAutocomplete(interaction);
        sinon.assert.calledOnceWithExactly(ctrl.voiceService.suggest, 'ずん');
        sinon.assert.calledOnceWithExactly(interaction.respond, choices);
    });

    specify('候補を取得できなければ、候補なしで応答する', async () => {
        const ctrl = ctrlWith(sinon.stub().rejects(new Error('timeout')));
        const interaction = autocompleteInteraction('speaker', { name: 'name', value: 'ずん' });

        await ctrl.onAutocomplete(interaction);
        sinon.assert.calledOnceWithExactly(interaction.respond, []);
    });

    specify('ほかのコマンドには候補なしで応答する', async () => {
        const ctrl = ctrlWith(sinon.stub().resolves([{ name: 'x', value: 'x' }]));
        const interaction = autocompleteInteraction('help', { name: 'name', value: '' });

        await ctrl.onAutocomplete(interaction);
        sinon.assert.notCalled(ctrl.voiceService.suggest);
        sinon.assert.calledOnceWithExactly(interaction.respond, []);
    });

    specify('自動補完以外のインタラクションは扱わない', async () => {
        const ctrl = ctrlWith(sinon.stub());
        let error;
        try {
            await ctrl.onAutocomplete({ isAutocomplete: () => false });
        } catch (e) {
            error = e;
        }
        error.type.should.equal('abort');
    });
});

const should = require('chai').should();
const sinon = require('sinon');
const ActionHandler = require('../../src/domain/service/action_handler');
const SpeakerUpdateAction = require('../../src/domain/entity/actions/speaker_update_action');

/************************************************************************
 * ActionHandlerクラス単体スペック
 *
 * メソッド：#handle
 * 期待動作：アクションタイプに応じて適切なリポジトリメソッドを呼び出す
 * 備考：全リポジトリをsinon stubで差し替え
 ***********************************************************************/

describe('ActionHandler', () => {
    let vcActionRepo, wordActionRepo, silenceActionRepo, foleyActionRepo, settingsActionRepo, voiceCatalogRepo;
    let handler;
    let dispatchTargets;
    let allRepoStubs;

    function assertExclusiveDispatch(expectedStub, action) {
        sinon.assert.calledOnceWithExactly(expectedStub, action);
        allRepoStubs.filter((stub) => stub !== expectedStub).forEach((stub) => sinon.assert.notCalled(stub));
    }

    beforeEach(() => {
        vcActionRepo = {
            postJoinVoice: sinon.stub().resolves(),
            postLeaveVoice: sinon.stub().resolves(),
            postSeibai: sinon.stub().resolves(),
        };
        wordActionRepo = {
            postWordCreate: sinon.stub().resolves(),
            postWordDelete: sinon.stub().resolves(),
            postWordClear: sinon.stub().resolves(),
        };
        silenceActionRepo = {
            postSilenceCreate: sinon.stub().resolves(),
            postSilenceDelete: sinon.stub().resolves(),
            postSilenceClear: sinon.stub().resolves(),
        };
        foleyActionRepo = {
            postFoleyCreate: sinon.stub().resolves(),
            postFoleyCreateMultiple: sinon.stub().resolves(),
            postFoleyDelete: sinon.stub().resolves(),
            postFoleyDeleteMultiple: sinon.stub().resolves(),
            postFoleyRename: sinon.stub().resolves(),
        };
        settingsActionRepo = {
            postMaxCountUpdate: sinon.stub().resolves(),
            postSpeakerUpdate: sinon.stub().resolves(),
            postSeNormalizeUpdate: sinon.stub().resolves(),
            postTextCommandsUpdate: sinon.stub().resolves(),
        };

        // 既定では入力をそのまま話者として受け付ける（照合の振る舞いは speaker_update の節で確かめる）
        voiceCatalogRepo = {
            resolveVoice: sinon.stub().callsFake(async (query) => ({
                voice: { address: query, displayName: query, engine: null, credit: null },
                suggestions: [],
            })),
            loadVoiceCatalog: sinon.stub().resolves({ lines: [] }),
        };
        handler = new ActionHandler(
            vcActionRepo,
            wordActionRepo,
            silenceActionRepo,
            foleyActionRepo,
            settingsActionRepo,
            voiceCatalogRepo
        );

        dispatchTargets = {
            join_voice: vcActionRepo.postJoinVoice,
            leave_voice: vcActionRepo.postLeaveVoice,
            seibai: vcActionRepo.postSeibai,
            word_create: wordActionRepo.postWordCreate,
            word_delete: wordActionRepo.postWordDelete,
            word_clear: wordActionRepo.postWordClear,
            silence_create: silenceActionRepo.postSilenceCreate,
            silence_delete: silenceActionRepo.postSilenceDelete,
            silence_clear: silenceActionRepo.postSilenceClear,
            foley_create: foleyActionRepo.postFoleyCreate,
            foley_create_multiple: foleyActionRepo.postFoleyCreateMultiple,
            foley_delete: foleyActionRepo.postFoleyDelete,
            foley_delete_multiple: foleyActionRepo.postFoleyDeleteMultiple,
            foley_rename: foleyActionRepo.postFoleyRename,
            max_count_update: settingsActionRepo.postMaxCountUpdate,
            speaker_update: settingsActionRepo.postSpeakerUpdate,
            se_normalize_update: settingsActionRepo.postSeNormalizeUpdate,
            text_commands_update: settingsActionRepo.postTextCommandsUpdate,
            voice_catalog_load: voiceCatalogRepo.loadVoiceCatalog,
        };
        allRepoStubs = Object.values(dispatchTargets);
    });

    afterEach(() => {
        sinon.restore();
    });

    describe('#handle', () => {
        context('VCアクション', () => {
            specify('join_voiceはvcActionRepo.postJoinVoiceを呼ぶ', async () => {
                const action = { type: 'join_voice' };
                await handler.handle(action);
                assertExclusiveDispatch(dispatchTargets.join_voice, action);
            });

            specify('leave_voiceはvcActionRepo.postLeaveVoiceを呼ぶ', async () => {
                const action = { type: 'leave_voice' };
                await handler.handle(action);
                assertExclusiveDispatch(dispatchTargets.leave_voice, action);
            });

            specify('seibaiはvcActionRepo.postSeibaiを呼ぶ', async () => {
                const action = { type: 'seibai' };
                await handler.handle(action);
                assertExclusiveDispatch(dispatchTargets.seibai, action);
            });
        });

        context('Wordアクション', () => {
            specify('word_createはwordActionRepo.postWordCreateを呼ぶ', async () => {
                const action = { type: 'word_create' };
                await handler.handle(action);
                assertExclusiveDispatch(dispatchTargets.word_create, action);
            });

            specify('word_deleteはwordActionRepo.postWordDeleteを呼ぶ', async () => {
                const action = { type: 'word_delete' };
                await handler.handle(action);
                assertExclusiveDispatch(dispatchTargets.word_delete, action);
            });

            specify('word_clearはwordActionRepo.postWordClearを呼ぶ', async () => {
                const action = { type: 'word_clear' };
                await handler.handle(action);
                assertExclusiveDispatch(dispatchTargets.word_clear, action);
            });
        });

        context('Silenceアクション', () => {
            specify('silence_createはsilenceActionRepo.postSilenceCreateを呼ぶ', async () => {
                const action = { type: 'silence_create' };
                await handler.handle(action);
                assertExclusiveDispatch(dispatchTargets.silence_create, action);
            });

            specify('silence_deleteはsilenceActionRepo.postSilenceDeleteを呼ぶ', async () => {
                const action = { type: 'silence_delete' };
                await handler.handle(action);
                assertExclusiveDispatch(dispatchTargets.silence_delete, action);
            });

            specify('silence_clearはsilenceActionRepo.postSilenceClearを呼ぶ', async () => {
                const action = { type: 'silence_clear' };
                await handler.handle(action);
                assertExclusiveDispatch(dispatchTargets.silence_clear, action);
            });
        });

        context('Foleyアクション', () => {
            specify('foley_createはfoleyActionRepo.postFoleyCreateを呼ぶ', async () => {
                const action = { type: 'foley_create' };
                await handler.handle(action);
                assertExclusiveDispatch(dispatchTargets.foley_create, action);
            });

            specify('foley_create_multipleはfoleyActionRepo.postFoleyCreateMultipleを呼ぶ', async () => {
                const action = { type: 'foley_create_multiple' };
                await handler.handle(action);
                assertExclusiveDispatch(dispatchTargets.foley_create_multiple, action);
            });

            specify('foley_deleteはfoleyActionRepo.postFoleyDeleteを呼ぶ', async () => {
                const action = { type: 'foley_delete' };
                await handler.handle(action);
                assertExclusiveDispatch(dispatchTargets.foley_delete, action);
            });

            specify('foley_delete_multipleはfoleyActionRepo.postFoleyDeleteMultipleを呼ぶ', async () => {
                const action = { type: 'foley_delete_multiple' };
                await handler.handle(action);
                assertExclusiveDispatch(dispatchTargets.foley_delete_multiple, action);
            });

            specify('foley_renameはfoleyActionRepo.postFoleyRenameを呼ぶ', async () => {
                const action = { type: 'foley_rename' };
                await handler.handle(action);
                assertExclusiveDispatch(dispatchTargets.foley_rename, action);
            });
        });

        context('Settingsアクション', () => {
            specify('max_count_updateはsettingsActionRepo.postMaxCountUpdateを呼ぶ', async () => {
                const action = { type: 'max_count_update' };
                await handler.handle(action);
                assertExclusiveDispatch(dispatchTargets.max_count_update, action);
            });

            specify('speaker_updateはsettingsActionRepo.postSpeakerUpdateを呼ぶ', async () => {
                const action = { type: 'speaker_update' };
                await handler.handle(action);
                assertExclusiveDispatch(dispatchTargets.speaker_update, action);
            });

            specify('se_normalize_updateはsettingsActionRepo.postSeNormalizeUpdateを呼ぶ', async () => {
                const action = { type: 'se_normalize_update' };
                await handler.handle(action);
                assertExclusiveDispatch(dispatchTargets.se_normalize_update, action);
            });

            specify('text_commands_updateはsettingsActionRepo.postTextCommandsUpdateを呼ぶ', async () => {
                const action = { type: 'text_commands_update' };
                await handler.handle(action);
                assertExclusiveDispatch(dispatchTargets.text_commands_update, action);
            });
        });

        context('読み上げキャラクター一覧', () => {
            specify('voice_catalog_loadはvoiceCatalogRepo.loadVoiceCatalogを呼び、一覧を返す', async () => {
                const action = { type: 'voice_catalog_load' };
                const result = await handler.handle(action);
                sinon.assert.calledOnceWithExactly(voiceCatalogRepo.loadVoiceCatalog);
                allRepoStubs
                    .filter((stub) => stub !== voiceCatalogRepo.loadVoiceCatalog)
                    .forEach((stub) => sinon.assert.notCalled(stub));
                result.should.deep.equal({ lines: [] });
            });
        });

        context('speaker_update の照合', () => {
            const speakerAction = (speaker) =>
                new SpeakerUpdateAction({ id: 'i', serverId: 's', userId: 'u', speaker });

            specify('照合した正式な指定に置き換えて保存し、話者を返す', async () => {
                const voice = {
                    address: 'voicevox:ずんだもん/あまあま',
                    displayName: 'ずんだもん（あまあま）',
                    engine: 'voicevox',
                    credit: 'VOICEVOX:ずんだもん',
                };
                voiceCatalogRepo.resolveVoice.resolves({ voice, suggestions: [] });

                const result = await handler.handle(speakerAction('ずんだもん あまあま'));

                sinon.assert.calledOnceWithExactly(voiceCatalogRepo.resolveVoice, 'ずんだもん あまあま');
                const saved = settingsActionRepo.postSpeakerUpdate.firstCall.args[0];
                saved.speaker.should.equal('voicevox:ずんだもん/あまあま');
                saved.userId.should.equal('u');
                result.should.equal(voice);
            });

            specify('見つからなければ候補を添えて失敗し、保存しない', async () => {
                voiceCatalogRepo.resolveVoice.resolves({
                    voice: null,
                    suggestions: [
                        { address: 'voicevox:四国めたん/ノーマル' },
                        { address: 'voicevox:四国めたん/あまあま' },
                    ],
                });

                try {
                    await handler.handle(speakerAction('めたーん'));
                    should.fail('should have thrown');
                } catch (e) {
                    e.eby.should.be.true;
                    e.message.should.include('「めたーん」という声は見つからなかったよ');
                    e.message.should.include('`voicevox:四国めたん/ノーマル` / `voicevox:四国めたん/あまあま`');
                }
                sinon.assert.notCalled(settingsActionRepo.postSpeakerUpdate);
            });
        });

        context('異常系', () => {
            specify('未知のアクションタイプはErrorを投げる', async () => {
                const action = { type: 'unknown_type' };
                try {
                    await handler.handle(action);
                    should.fail('should have thrown');
                } catch (e) {
                    e.message.should.equal('unreachable');
                }
                allRepoStubs.forEach((stub) => sinon.assert.notCalled(stub));
            });
        });
    });
});

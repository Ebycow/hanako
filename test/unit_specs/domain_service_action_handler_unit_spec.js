const should = require('chai').should();
const sinon = require('sinon');
const ActionHandler = require('../../src/domain/service/action_handler');

/************************************************************************
 * ActionHandlerクラス単体スペック
 *
 * メソッド：#handle
 * 期待動作：アクションタイプに応じて適切なリポジトリメソッドを呼び出す
 * 備考：全リポジトリをsinon stubで差し替え
 ***********************************************************************/

describe('ActionHandler', () => {
    let vcActionRepo, wordActionRepo, silenceActionRepo, foleyActionRepo, settingsActionRepo;
    let handler;

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
        };

        handler = new ActionHandler(
            vcActionRepo,
            wordActionRepo,
            silenceActionRepo,
            foleyActionRepo,
            settingsActionRepo
        );
    });

    afterEach(() => {
        sinon.restore();
    });

    describe('#handle', () => {
        context('VCアクション', () => {
            specify('join_voiceはvcActionRepo.postJoinVoiceを呼ぶ', async () => {
                const action = { type: 'join_voice' };
                await handler.handle(action);
                vcActionRepo.postJoinVoice.calledOnceWith(action).should.be.true;
            });

            specify('leave_voiceはvcActionRepo.postLeaveVoiceを呼ぶ', async () => {
                const action = { type: 'leave_voice' };
                await handler.handle(action);
                vcActionRepo.postLeaveVoice.calledOnceWith(action).should.be.true;
            });

            specify('seibaiはvcActionRepo.postSeibaiを呼ぶ', async () => {
                const action = { type: 'seibai' };
                await handler.handle(action);
                vcActionRepo.postSeibai.calledOnceWith(action).should.be.true;
            });
        });

        context('Wordアクション', () => {
            specify('word_createはwordActionRepo.postWordCreateを呼ぶ', async () => {
                const action = { type: 'word_create' };
                await handler.handle(action);
                wordActionRepo.postWordCreate.calledOnceWith(action).should.be.true;
            });

            specify('word_deleteはwordActionRepo.postWordDeleteを呼ぶ', async () => {
                const action = { type: 'word_delete' };
                await handler.handle(action);
                wordActionRepo.postWordDelete.calledOnceWith(action).should.be.true;
            });

            specify('word_clearはwordActionRepo.postWordClearを呼ぶ', async () => {
                const action = { type: 'word_clear' };
                await handler.handle(action);
                wordActionRepo.postWordClear.calledOnceWith(action).should.be.true;
            });
        });

        context('Silenceアクション', () => {
            specify('silence_createはsilenceActionRepo.postSilenceCreateを呼ぶ', async () => {
                const action = { type: 'silence_create' };
                await handler.handle(action);
                silenceActionRepo.postSilenceCreate.calledOnceWith(action).should.be.true;
            });

            specify('silence_deleteはsilenceActionRepo.postSilenceDeleteを呼ぶ', async () => {
                const action = { type: 'silence_delete' };
                await handler.handle(action);
                silenceActionRepo.postSilenceDelete.calledOnceWith(action).should.be.true;
            });

            specify('silence_clearはsilenceActionRepo.postSilenceClearを呼ぶ', async () => {
                const action = { type: 'silence_clear' };
                await handler.handle(action);
                silenceActionRepo.postSilenceClear.calledOnceWith(action).should.be.true;
            });
        });

        context('Foleyアクション', () => {
            specify('foley_createはfoleyActionRepo.postFoleyCreateを呼ぶ', async () => {
                const action = { type: 'foley_create' };
                await handler.handle(action);
                foleyActionRepo.postFoleyCreate.calledOnceWith(action).should.be.true;
            });

            specify('foley_create_multipleはfoleyActionRepo.postFoleyCreateMultipleを呼ぶ', async () => {
                const action = { type: 'foley_create_multiple' };
                await handler.handle(action);
                foleyActionRepo.postFoleyCreateMultiple.calledOnceWith(action).should.be.true;
            });

            specify('foley_deleteはfoleyActionRepo.postFoleyDeleteを呼ぶ', async () => {
                const action = { type: 'foley_delete' };
                await handler.handle(action);
                foleyActionRepo.postFoleyDelete.calledOnceWith(action).should.be.true;
            });

            specify('foley_delete_multipleはfoleyActionRepo.postFoleyDeleteMultipleを呼ぶ', async () => {
                const action = { type: 'foley_delete_multiple' };
                await handler.handle(action);
                foleyActionRepo.postFoleyDeleteMultiple.calledOnceWith(action).should.be.true;
            });

            specify('foley_renameはfoleyActionRepo.postFoleyRenameを呼ぶ', async () => {
                const action = { type: 'foley_rename' };
                await handler.handle(action);
                foleyActionRepo.postFoleyRename.calledOnceWith(action).should.be.true;
            });
        });

        context('Settingsアクション', () => {
            specify('max_count_updateはsettingsActionRepo.postMaxCountUpdateを呼ぶ', async () => {
                const action = { type: 'max_count_update' };
                await handler.handle(action);
                settingsActionRepo.postMaxCountUpdate.calledOnceWith(action).should.be.true;
            });

            specify('speaker_updateはsettingsActionRepo.postSpeakerUpdateを呼ぶ', async () => {
                const action = { type: 'speaker_update' };
                await handler.handle(action);
                settingsActionRepo.postSpeakerUpdate.calledOnceWith(action).should.be.true;
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
            });
        });
    });
});

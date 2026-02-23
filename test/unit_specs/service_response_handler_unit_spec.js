const should = require('chai').should();
const sinon = require('sinon');
const ResponseHandler = require('../../src/service/response_handler');
const ChatResponse = require('../../src/domain/entity/responses/chat_response');
const SilentResponse = require('../../src/domain/entity/responses/silent_response');
const ActionResponse = require('../../src/domain/entity/responses/action_response');
const EbyAbortError = require('../../src/core/errors/eby_abort_error');

/************************************************************************
 * ResponseHandlerクラス単体スペック
 *
 * メソッド：#handle
 * 期待動作：レスポンスタイプに応じて適切なリポジトリ/サービスを呼び出す
 * 備考：ActionResponseの再帰処理とエラーハンドリングが重要
 ***********************************************************************/

describe('ResponseHandler', () => {
    let chatRepo, voiceRepo, actionHandler;
    let handler;

    beforeEach(() => {
        chatRepo = {
            postChat: sinon.stub().resolves(),
        };
        voiceRepo = {
            postVoice: sinon.stub().resolves(),
        };
        actionHandler = {
            handle: sinon.stub().resolves(),
        };
        handler = new ResponseHandler(chatRepo, voiceRepo, actionHandler);
    });

    afterEach(() => {
        sinon.restore();
    });

    describe('#handle', () => {
        context('ChatResponse', () => {
            specify('chatRepo.postChatを呼ぶ', async () => {
                const response = new ChatResponse({
                    id: '1',
                    content: 'テスト',
                    code: 'simple',
                    channelId: 'ch-1',
                });
                await handler.handle(response);
                chatRepo.postChat.calledOnceWith(response).should.be.true;
            });
        });

        context('VoiceResponse', () => {
            specify('voiceRepo.postVoiceを呼ぶ', async () => {
                const response = { type: 'voice', id: '1', stream: {}, serverId: 's-1' };
                await handler.handle(response);
                voiceRepo.postVoice.calledOnceWith(response).should.be.true;
            });
        });

        context('SilentResponse', () => {
            specify('何も呼ばずに正常終了する', async () => {
                const response = new SilentResponse();
                await handler.handle(response);
                chatRepo.postChat.called.should.be.false;
                voiceRepo.postVoice.called.should.be.false;
                actionHandler.handle.called.should.be.false;
            });
        });

        context('ActionResponse - 成功時', () => {
            specify('アクション成功時はonSuccessを処理する', async () => {
                const onSuccess = new ChatResponse({
                    id: '2',
                    content: '成功',
                    code: 'simple',
                    channelId: 'ch-1',
                });
                const action = { type: 'word_create' };
                const response = new ActionResponse({
                    id: '1',
                    action,
                    onSuccess,
                });

                await handler.handle(response);
                actionHandler.handle.calledOnceWith(action).should.be.true;
                chatRepo.postChat.calledOnce.should.be.true;
                chatRepo.postChat.firstCall.args[0].content.should.equal('成功');
            });

            specify('onSuccess省略時はSilentResponseとして処理する', async () => {
                const action = { type: 'word_create' };
                const response = new ActionResponse({ id: '1', action });

                await handler.handle(response);
                actionHandler.handle.calledOnce.should.be.true;
                chatRepo.postChat.called.should.be.false;
            });
        });

        context('ActionResponse - 失敗時', () => {
            specify('ebyエラーかつonFailureがChatResponseならwithErrorで会話に反映する', async () => {
                const ebyError = new EbyAbortError('テストエラー');
                actionHandler.handle.rejects(ebyError);

                const onFailure = new ChatResponse({
                    id: '3',
                    content: '失敗',
                    code: 'error',
                    channelId: 'ch-1',
                });
                const action = { type: 'word_create' };
                const response = new ActionResponse({ id: '1', action, onFailure });

                await handler.handle(response);
                actionHandler.handle.calledOnce.should.be.true;
                chatRepo.postChat.calledOnce.should.be.true;
            });

            specify('ebyエラーでないエラーはPromise rejectする', async () => {
                const genericError = new Error('予期せぬエラー');
                actionHandler.handle.rejects(genericError);

                const action = { type: 'word_create' };
                const response = new ActionResponse({ id: '1', action });

                try {
                    await handler.handle(response);
                    should.fail('should have rejected');
                } catch (e) {
                    e.message.should.equal('予期せぬエラー');
                }
            });
        });

        context('異常系', () => {
            specify('未知のレスポンスタイプはErrorを投げる', async () => {
                const response = { type: 'unknown_type' };
                try {
                    await handler.handle(response);
                    should.fail('should have thrown');
                } catch (e) {
                    e.message.should.equal('unreachable');
                }
            });
        });
    });
});

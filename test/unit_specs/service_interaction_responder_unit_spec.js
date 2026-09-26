const should = require('chai').should();
const sinon = require('sinon');
const { MessageFlags } = require('discord.js');
const InteractionResponder = require('../../src/service/interaction_responder');
const ChatResponse = require('../../src/domain/entity/responses/chat_response');
const SilentResponse = require('../../src/domain/entity/responses/silent_response');
const ActionResponse = require('../../src/domain/entity/responses/action_response');
const EbyDisappointedError = require('../../src/core/errors/eby_disappointed_error');

/************************************************************************
 * InteractionResponderクラス単体スペック
 *
 * メソッド：#respond, #replyFailure
 * 期待動作：コマンドのレスポンスをインタラクションへの返信として返す
 * 備考：エラーは公開で保留していても実行者にだけ見せる
 ***********************************************************************/

describe('InteractionResponder', () => {
    let actionHandler;
    let responder;
    let interaction;

    function chat(content, code = 'simple') {
        return new ChatResponse({ id: '1', content, code, channelId: 'ch-1' });
    }

    beforeEach(() => {
        actionHandler = { handle: sinon.stub().resolves() };
        responder = new InteractionResponder(actionHandler);
        interaction = {
            editReply: sinon.stub().resolves(),
            deleteReply: sinon.stub().resolves(),
            followUp: sinon.stub().resolves(),
        };
    });

    afterEach(() => {
        sinon.restore();
    });

    describe('#respond', () => {
        context('ChatResponse', () => {
            specify('保留した応答を内容で置き換える（チャンネルには投稿しない）', async () => {
                const succeeded = await responder.respond(interaction, chat('はい'), false);
                succeeded.should.be.true;
                interaction.editReply.calledOnceWith('はい').should.be.true;
                interaction.followUp.called.should.be.false;
            });

            specify('公開で保留していたエラーは、保留を取り消して実行者にだけ見せる', async () => {
                const succeeded = await responder.respond(interaction, chat('だめ', 'error'), false);
                succeeded.should.be.false;
                interaction.deleteReply.calledOnce.should.be.true;
                interaction.followUp.firstCall.args[0].should.deep.equal({
                    content: 'だめ',
                    flags: MessageFlags.Ephemeral,
                });
                interaction.editReply.called.should.be.false;
            });

            specify('実行者にだけ見える形で保留していたエラーはそのまま置き換える', async () => {
                const succeeded = await responder.respond(interaction, chat('だめ', 'error'), true);
                succeeded.should.be.false;
                interaction.editReply.calledOnceWith('だめ').should.be.true;
                interaction.deleteReply.called.should.be.false;
            });
        });

        context('ChatResponse（ページャー）', () => {
            specify('ページ送りボタンを付けて返信する', async () => {
                await responder.respond(interaction, chat('Dictionary 1 / 2 page', 'pager'), true);
                const payload = interaction.editReply.firstCall.args[0];
                payload.content.should.equal('Dictionary 1 / 2 page');
                const buttons = payload.components[0].toJSON().components;
                buttons.map((b) => b.custom_id).should.deep.equal(['hanako:pager:backward', 'hanako:pager:forward']);
            });
        });

        context('SilentResponse', () => {
            specify('実行したことだけを返信する', async () => {
                await responder.respond(interaction, new SilentResponse(), false);
                interaction.editReply.firstCall.args[0].should.have.string('実行しました');
            });
        });

        context('ActionResponse', () => {
            specify('アクションを実行して onSuccess を返信する', async () => {
                const response = new ActionResponse({ id: '1', action: { type: 'x' }, onSuccess: chat('できた') });
                const succeeded = await responder.respond(interaction, response, false);
                succeeded.should.be.true;
                actionHandler.handle.calledOnce.should.be.true;
                interaction.editReply.calledOnceWith('できた').should.be.true;
            });

            specify('アクションが失敗したら理由付きの onFailure を実行者にだけ見せる', async () => {
                actionHandler.handle.rejects(new EbyDisappointedError('x', '満員でした'));
                const response = new ActionResponse({
                    id: '1',
                    action: { type: 'x' },
                    onSuccess: chat('できた'),
                    onFailure: chat('できなかった', 'error'),
                });
                const succeeded = await responder.respond(interaction, response, false);
                succeeded.should.be.false;
                interaction.followUp.firstCall.args[0].content.should.equal('できなかった\n満員でした');
            });

            specify('onFailure がないときは例外をそのまま投げる', async () => {
                const error = new EbyDisappointedError('x', '満員でした');
                actionHandler.handle.rejects(error);
                const response = new ActionResponse({ id: '1', action: { type: 'x' } });
                try {
                    await responder.respond(interaction, response, false);
                    should.fail('should have rejected');
                } catch (e) {
                    e.should.equal(error);
                }
            });
        });
    });

    describe('#replyFailure', () => {
        specify('失敗したことを実行者にだけ見せる', async () => {
            await responder.replyFailure(interaction, new Error('boom'), false);
            interaction.followUp.firstCall.args[0].content.should.have.string('失敗しました');
            interaction.followUp.firstCall.args[0].content.should.not.have.string('boom');
        });

        specify('説明付きの EbyDisappointedError なら理由も伝える', async () => {
            const error = new EbyDisappointedError('missing', '権限がないみたい');
            await responder.replyFailure(interaction, error, true);
            interaction.editReply.firstCall.args[0].should.have.string('権限がないみたい');
        });
    });
});

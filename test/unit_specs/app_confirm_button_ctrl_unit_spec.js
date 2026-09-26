require('chai').should();
const sinon = require('sinon');
const proxyquire = require('proxyquire').noCallThru();

/************************************************************************
 * ConfirmButtonCtrlクラス単体スペック
 *
 * メソッド：#onConfirmButton
 * 期待動作：確認ボタンで確定したら、確定済みとしてスラッシュコマンドを実行する
 * 備考：なし
 ***********************************************************************/

describe('ConfirmButtonCtrl', () => {
    let builderBuild;
    let serviceServe;
    let respond;
    let replyFailure;
    let ConfirmButtonCtrl;

    beforeEach(() => {
        builderBuild = sinon.stub().resolves({ id: 'entity' });
        serviceServe = sinon.stub().resolves({ type: 'silent' });
        respond = sinon.stub().resolves(true);
        replyFailure = sinon.stub().resolves();
        ConfirmButtonCtrl = proxyquire('../../src/app/confirm_button_ctrl', {
            '../service/interaction_builder': class {
                async build(...args) {
                    return builderBuild(...args);
                }
            },
            '../service/message_service': class {
                async serve(...args) {
                    return serviceServe(...args);
                }
            },
            '../service/interaction_responder': class {
                static confirmedReplyTarget(interaction, commandName) {
                    return { interaction, commandName };
                }
                async respond(...args) {
                    return respond(...args);
                }
                async replyFailure(...args) {
                    return replyFailure(...args);
                }
            },
            '../service/hanako_loader': class {
                async load() {
                    return { id: 'hanako' };
                }
            },
        });
    });

    afterEach(() => {
        sinon.restore();
    });

    function buttonInteraction(customId) {
        return {
            id: 'button-id',
            customId,
            isButton: () => true,
            inCachedGuild: () => true,
            user: { id: 'alice-id', username: 'alice' },
            channel: { id: 'channel-id', name: 'general' },
            guildId: 'guild-id',
            guild: { id: 'guild-id', name: 'guild-name' },
            member: { voice: { channel: null } },
            update: sinon.stub().resolves(),
            deferUpdate: sinon.stub().resolves(),
        };
    }

    specify('「実行する」なら確定済み（force）としてスラッシュコマンドを実行する', async () => {
        const interaction = buttonInteraction('hanako:confirm:blacklist-clear');

        await new ConfirmButtonCtrl({}).onConfirmButton(interaction);

        interaction.deferUpdate.calledOnce.should.be.true;
        const builderParam = builderBuild.firstCall.args[1];
        builderParam.commandName.should.equal('blacklist-clear');
        builderParam.commandArgs.should.deep.equal({ force: true });
        respond.firstCall.args[0].should.deep.equal({ interaction, commandName: 'blacklist-clear' });
    });

    specify('「やめておく」なら何も実行せずボタンを外す', async () => {
        const interaction = buttonInteraction('hanako:confirm-cancel');

        await new ConfirmButtonCtrl({}).onConfirmButton(interaction);

        interaction.update.firstCall.args[0].components.should.deep.equal([]);
        serviceServe.called.should.be.false;
    });

    specify('確認ボタン以外のインタラクションは中断する', async () => {
        const err = await new ConfirmButtonCtrl({})
            .onConfirmButton(buttonInteraction('hanako:pager:forward'))
            .catch((e) => e);
        err.type.should.equal('abort');
    });

    specify('実行に失敗したら失敗を伝え、エラーは上位に伝える', async () => {
        const error = new Error('boom');
        serviceServe.rejects(error);

        const err = await new ConfirmButtonCtrl({})
            .onConfirmButton(buttonInteraction('hanako:confirm:blacklist-clear'))
            .catch((e) => e);

        err.should.equal(error);
        replyFailure.calledOnce.should.be.true;
    });
});

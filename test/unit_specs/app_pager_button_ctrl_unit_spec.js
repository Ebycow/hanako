require('chai').should();
const sinon = require('sinon');
const proxyquire = require('proxyquire').noCallThru();
const { MessageFlags } = require('discord.js');

/************************************************************************
 * PagerButtonCtrlクラス単体スペック
 *
 * メソッド：#onPagerButton
 * 期待動作：ページ送りボタンが押されたらメッセージを次のページに書き換える
 * 備考：なし
 ***********************************************************************/

describe('PagerButtonCtrl', () => {
    let pagerBuild;
    let pagerServe;
    let PagerButtonCtrl;

    beforeEach(() => {
        pagerBuild = sinon.stub().resolves({ id: 'pager' });
        pagerServe = sinon.stub().resolves('次のページ');
        PagerButtonCtrl = proxyquire('../../src/app/pager_button_ctrl', {
            '../service/hanako_loader': class {
                async load() {
                    return { id: 'hanako' };
                }
            },
            '../service/pager_builder': class {
                async build(...args) {
                    return pagerBuild(...args);
                }
            },
            '../service/pager_service': class {
                async serve(...args) {
                    return pagerServe(...args);
                }
            },
        });
    });

    afterEach(() => {
        sinon.restore();
    });

    function buttonInteraction(customId) {
        return {
            customId,
            isButton: () => true,
            inCachedGuild: () => true,
            guild: { id: 'guild-id' },
            message: { content: 'Dictionary 1 / 2 page' },
            update: sinon.stub().resolves(),
            reply: sinon.stub().resolves(),
            replied: false,
            deferred: false,
        };
    }

    specify('押されたボタンの方向にページを送ってメッセージを書き換える', async () => {
        const interaction = buttonInteraction('hanako:pager:forward');

        await new PagerButtonCtrl({}).onPagerButton(interaction);

        pagerBuild.firstCall.args[1].should.equal('Dictionary 1 / 2 page');
        pagerServe.firstCall.args[1].should.equal('forward');
        interaction.update.calledOnceWith({ content: '次のページ' }).should.be.true;
    });

    specify('ページを送れなかったら押した人にだけ失敗を伝え、エラーは上位に伝える', async () => {
        const error = new Error('no pageable');
        pagerBuild.rejects(error);
        const interaction = buttonInteraction('hanako:pager:forward');

        const err = await new PagerButtonCtrl({}).onPagerButton(interaction).catch((e) => e);

        err.should.equal(error);
        interaction.update.called.should.be.false;
        interaction.reply.calledOnce.should.be.true;
        interaction.reply.firstCall.args[0].flags.should.equal(MessageFlags.Ephemeral);
    });

    specify('応答済みのあとに失敗したときは重ねて返信しない', async () => {
        const error = new Error('after update');
        const interaction = buttonInteraction('hanako:pager:forward');
        interaction.update = sinon.stub().callsFake(async () => {
            interaction.replied = true;
            throw error;
        });

        const err = await new PagerButtonCtrl({}).onPagerButton(interaction).catch((e) => e);

        err.should.equal(error);
        interaction.reply.called.should.be.false;
    });

    specify('ページ送り以外のボタンは中断する', async () => {
        const interaction = buttonInteraction('other:button');

        const err = await new PagerButtonCtrl({}).onPagerButton(interaction).catch((e) => e);

        err.type.should.equal('abort');
        interaction.update.called.should.be.false;
    });

    specify('スラッシュコマンドなどボタン以外のインタラクションは中断する', async () => {
        const interaction = { isButton: () => false };

        const err = await new PagerButtonCtrl({}).onPagerButton(interaction).catch((e) => e);

        err.type.should.equal('abort');
    });
});

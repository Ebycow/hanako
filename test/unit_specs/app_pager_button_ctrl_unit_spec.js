require('chai').should();
const sinon = require('sinon');
const proxyquire = require('proxyquire').noCallThru();

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
        };
    }

    specify('押されたボタンの方向にページを送ってメッセージを書き換える', async () => {
        const interaction = buttonInteraction('hanako:pager:forward');

        await new PagerButtonCtrl({}).onPagerButton(interaction);

        pagerBuild.firstCall.args[1].should.equal('Dictionary 1 / 2 page');
        pagerServe.firstCall.args[1].should.equal('forward');
        interaction.update.calledOnceWith({ content: '次のページ' }).should.be.true;
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

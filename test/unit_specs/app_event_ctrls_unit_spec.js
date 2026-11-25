require('chai').should();
const sinon = require('sinon');
const proxyquire = require('proxyquire').noCallThru();
const { ActivityType, ChannelType } = require('discord.js');
const PagerReactionFilterMiddleWare = require('../../src/app/pager_reaction_filter_middle_ware');

/************************************************************************
 * Discord のイベントを受けるコントローラ群
 *
 * 方針：サービス層は proxyquire で差し替え、
 *       「Discord のオブジェクトから何を取り出してサービスへ渡すか」と
 *       「結果を Discord にどう反映するか」だけを確かめる。
 ***********************************************************************/

/** discord.js の Collection のうち、コントローラが使う部分だけを持つ偽物 */
function collection(items) {
    const map = new Map(items.map((x, i) => [x.id || String(i), x]));
    return {
        size: map.size,
        values: () => map.values(),
        map: (fn) => Array.from(map.values()).map(fn),
        reduce: (fn, init) => Array.from(map.values()).reduce(fn, init),
        filter: (fn) => collection(Array.from(map.values()).filter(fn)),
    };
}

/** サービスのクラスを、メソッド呼び出しを stub に流すクラスに置き換える */
function stubClass(methods) {
    return class {
        constructor() {
            Object.entries(methods).forEach(([name, stub]) => (this[name] = (...args) => stub(...args)));
        }
    };
}

describe('MessageCtrl', () => {
    let stubs;
    let MessageCtrl;

    beforeEach(() => {
        stubs = {
            validate: sinon.stub().resolves(),
            load: sinon.stub().resolves({ id: 'hanako' }),
            build: sinon.stub().resolves({ id: 'entity' }),
            serve: sinon.stub().resolves({ id: 'response' }),
            handle: sinon.stub().resolves(),
        };
        MessageCtrl = proxyquire('../../src/app/message_ctrl', {
            '../service/message_validator': stubClass({ validate: stubs.validate }),
            '../service/hanako_loader': stubClass({ load: stubs.load }),
            '../service/message_builder': stubClass({ build: stubs.build }),
            '../service/message_service': stubClass({ serve: stubs.serve }),
            '../service/response_handler': stubClass({ handle: stubs.handle }),
            '../service/member_permissions': { memberPermissionNames: () => ['manage'] },
        });
    });

    function message(overrides = {}) {
        return Object.assign(
            {
                id: 'm1',
                author: { id: 'u1', bot: false, username: 'alice' },
                channel: { id: 'c1', name: 'general', type: ChannelType.GuildText },
                guild: { id: 'g1', name: 'Guild' },
                member: { voice: { channel: { id: 'v1' } } },
                mentions: { members: collection([{ id: 'u2', displayName: 'bob' }]) },
                attachments: collection([
                    { id: 'a1', name: 'file.wav', title: 'タイトル', url: 'https://x/1' },
                    { id: 'a2', name: 'raw.mp3', url: 'https://x/2' },
                ]),
            },
            overrides
        );
    }

    specify('メッセージをエンティティにして、サービスの結果をレスポンスハンドラに渡す', async () => {
        await new MessageCtrl({}).onMessage(message(), '標準化済み');

        stubs.validate.firstCall.args[0].should.deep.equal({
            isBot: false,
            content: '標準化済み',
            userName: 'alice',
            channelType: ChannelType.GuildText,
        });
        stubs.load.calledWith('g1').should.equal(true);

        const [hanako, param] = stubs.build.firstCall.args;
        hanako.should.deep.equal({ id: 'hanako' });
        param.should.deep.include({
            id: 'm1',
            content: '標準化済み',
            userId: 'u1',
            channelId: 'c1',
            serverId: 'g1',
            voiceChannelId: 'v1',
            memberPermissions: ['manage'],
        });
        param.mentionedUsers.get('bob').should.equal('u2');
        param.attachments.should.deep.equal([
            { name: 'タイトル', url: 'https://x/1' },
            { name: 'raw.mp3', url: 'https://x/2' },
        ]);

        stubs.serve.calledWith({ id: 'hanako' }, { id: 'entity' }).should.equal(true);
        stubs.handle.calledWith({ id: 'response' }).should.equal(true);
    });

    specify('送信者が通話に入っていなければ voiceChannelId は null', async () => {
        await new MessageCtrl({}).onMessage(message({ member: { voice: { channel: null } } }), 'x');
        (stubs.build.firstCall.args[1].voiceChannelId === null).should.equal(true);
    });

    specify('バリデーションで弾かれたら花子を読み込まない', async () => {
        const abort = new Error('abort');
        stubs.validate.rejects(abort);
        const err = await new MessageCtrl({}).onMessage(message(), 'x').catch((e) => e);
        err.should.equal(abort);
        stubs.load.called.should.equal(false);
        stubs.handle.called.should.equal(false);
    });
});

describe('AutoLeaveCtrl', () => {
    let load;
    let serve;
    let AutoLeaveCtrl;

    beforeEach(() => {
        load = sinon.stub().resolves({ id: 'hanako' });
        serve = sinon.stub().resolves();
        AutoLeaveCtrl = proxyquire('../../src/app/auto_leave_ctrl', {
            '../service/hanako_loader': stubClass({ load }),
            '../service/auto_leave_service': stubClass({ serve }),
        });
    });

    const channel = { name: 'VC', members: collection([{ id: 'hanako-id' }, { id: 'u1' }]) };
    const member = { guild: { id: 'g1', name: 'Guild' } };

    specify('誰かが抜けたら、残っているメンバーで自動退出を判断する', async () => {
        await new AutoLeaveCtrl({}).onAutoLeave(channel, member, 'left');
        load.calledWith('g1').should.equal(true);
        serve.firstCall.args[1].should.deep.equal({
            serverName: 'Guild',
            voiceChannelName: 'VC',
            voiceChannelMembersId: ['hanako-id', 'u1'],
        });
    });

    specify('入ってきたときは abort で何もしない', async () => {
        const err = await new AutoLeaveCtrl({}).onAutoLeave(channel, member, 'joined').catch((e) => e);
        err.should.have.property('type', 'abort');
        load.called.should.equal(false);
    });
});

describe('PagerReactionCtrl', () => {
    specify('リアクションの方向にページを送り、メッセージを書き換える', async () => {
        const build = sinon.stub().resolves({ id: 'pager' });
        const serve = sinon.stub().resolves('次のページ');
        const PagerReactionCtrl = proxyquire('../../src/app/pager_reaction_ctrl', {
            '../service/hanako_loader': stubClass({ load: async () => ({ id: 'hanako' }) }),
            '../service/pager_builder': stubClass({ build }),
            '../service/pager_service': stubClass({ serve }),
        });
        const reaction = { message: { guild: { id: 'g1' }, content: '1 / 2', edit: sinon.stub().resolves() } };

        await new PagerReactionCtrl({}).onPagerReaction(reaction, { id: 'u1' }, 'backward');

        build.firstCall.args[1].should.equal('1 / 2');
        serve.calledWith({ id: 'pager' }, 'backward').should.equal(true);
        reaction.message.edit.calledWith('次のページ').should.equal(true);
    });
});

describe('PagerReactionFilterMiddleWare', () => {
    const BOT_ID = 'bot-id';
    const client = { user: { id: BOT_ID } };

    function reaction({ author = BOT_ID, emoji = '👉', selfReactions = 2 } = {}) {
        const others = [{ id: 'x', me: false }];
        const mine = Array.from({ length: selfReactions }, (_, i) => ({ id: `me${i}`, me: true }));
        return {
            emoji: { name: emoji },
            message: { author: { id: author }, reactions: { cache: collection([...mine, ...others]) } },
        };
    }

    const mw = new PagerReactionFilterMiddleWare(client);
    const user = { id: 'u1' };

    specify('👉 は forward、👈 は backward として通す', async () => {
        const r1 = reaction({ emoji: '👉' });
        (await mw.transform(r1, user)).should.deep.equal([r1, user, 'forward']);
        const r2 = reaction({ emoji: '👈' });
        (await mw.transform(r2, user)).should.deep.equal([r2, user, 'backward']);
    });

    const aborts = {
        花子以外のメッセージへのリアクション: [reaction({ author: 'someone' }), user],
        花子自身のリアクション: [reaction(), { id: BOT_ID }],
        '花子のリアクションが 2 つでないメッセージ': [reaction({ selfReactions: 1 }), user],
        ページ送り以外の絵文字: [reaction({ emoji: '👍' }), user],
        '肌の色つきの 👉🏻': [reaction({ emoji: '👉🏻' }), user],
    };
    Object.entries(aborts).forEach(([name, args]) => {
        specify(`${name}は abort で無視する`, async () => {
            const err = await mw.transform(...args).catch((e) => e);
            err.should.have.property('type', 'abort');
        });
    });
});

describe('ReadyCtrl', () => {
    specify('起動時は、まず通話へ復帰してから、次の終了に備えて監督を始める', async () => {
        const serve = sinon.stub().resolves();
        const supervise = sinon.stub().resolves();
        const ReadyCtrl = proxyquire('../../src/app/ready_ctrl', {
            '../service/recovery_service': stubClass({ serve }),
            '../service/recovery_supervisor': stubClass({ supervise }),
        });

        await new ReadyCtrl({ user: { tag: 'hanako#0001' } }).onReady();

        serve.calledOnce.should.equal(true);
        supervise.calledOnce.should.equal(true);
        serve.calledBefore(supervise).should.equal(true);
    });
});

describe('StatusChangeCtrl', () => {
    let clock;
    let serve;
    let client;
    let StatusChangeCtrl;

    beforeEach(() => {
        clock = sinon.useFakeTimers();
        serve = sinon.stub().resolves('>help | 1回読んだ！');
        client = { user: { setActivity: sinon.stub() } };
        StatusChangeCtrl = proxyquire('../../src/app/status_change_ctrl', {
            '../service/status_service': stubClass({ serve }),
        });
    });

    afterEach(() => clock.restore());

    specify('開始するとすぐにステータスを設定する', async () => {
        await new StatusChangeCtrl(client).onStatusChange();
        client.user.setActivity
            .calledOnceWith('>help | 1回読んだ！', { type: ActivityType.Streaming })
            .should.equal(true);
    });

    specify('1 分ごとに更新し、文言が変わったときだけ設定し直す', async () => {
        await new StatusChangeCtrl(client).onStatusChange();

        await clock.tickAsync(60000);
        client.user.setActivity.callCount.should.equal(1, '同じ文言なら設定しない');

        serve.resolves('>help | 2回読んだ！');
        await clock.tickAsync(60000);
        client.user.setActivity.callCount.should.equal(2);
        client.user.setActivity.lastCall.args[0].should.equal('>help | 2回読んだ！');
    });

    specify('何度呼ばれてもタイマーは一つだけ', async () => {
        const ctrl = new StatusChangeCtrl(client);
        await ctrl.onStatusChange();
        await ctrl.onStatusChange();
        serve.resetHistory();

        await clock.tickAsync(60000);
        serve.callCount.should.equal(1);
    });

    specify('定期更新で失敗しても、次の更新は続く', async () => {
        await new StatusChangeCtrl(client).onStatusChange();

        serve.rejects(new Error('temporary'));
        await clock.tickAsync(60000);

        serve.resolves('>help | 3回読んだ！');
        await clock.tickAsync(60000);
        client.user.setActivity.lastCall.args[0].should.equal('>help | 3回読んだ！');
    });
});

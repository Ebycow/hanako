require('chai').should();
const sinon = require('sinon');
const proxyquire = require('proxyquire').noCallThru();
const { PassThrough } = require('stream');
const { ChannelType } = require('discord.js');
const JoinVoiceAction = require('../../src/domain/entity/actions/join_voice_action');
const LeaveVoiceAction = require('../../src/domain/entity/actions/leave_voice_action');
const SeibaiAction = require('../../src/domain/entity/actions/seibai_action');
const VoiceResponse = require('../../src/domain/entity/responses/voice_response');
const ChatResponse = require('../../src/domain/entity/responses/chat_response');
const ServerStatus = require('../../src/domain/entity/server_status');

/************************************************************************
 * infra/discord のリポジトリ実装
 *
 * 方針：discord.js の Client / Channel はテストに必要な部分だけを持つ偽物にする。
 *       権限の判定（bot_permissions）は実物を使う。
 ***********************************************************************/

const noComprise = { comprise() {} };

/** 権限の過不足を指定できるチャンネルの偽物 */
function channel({ id, type, missing = [], joinable = true, timedOut = false, guildId = 'g1' }) {
    return {
        id,
        type,
        joinable,
        guild: { id: guildId, members: { me: { isCommunicationDisabled: () => timedOut } } },
        permissionsFor: () => ({ missing: () => missing }),
        send: sinon.stub().callsFake(async () => ({ react: sinon.stub().resolves() })),
    };
}

function clientWith(channels) {
    const byId = new Map(channels.map((c) => [c.id, c]));
    return { channels: { resolve: (id) => byId.get(id) || null }, user: { id: 'bot-id' } };
}

describe('DiscordVoiceQueueManager', () => {
    let Manager;
    let models;

    /** DiscordVoiceChatModel の偽物。作られたものは models に残る */
    class FakeVoiceChatModel {
        constructor(serverId) {
            this.serverId = serverId;
            this.connection = null;
            this.dispatcher = null;
            this.readingChannels = [];
            this.queue = [];
            this.killStream = sinon.stub().resolves();
            models.push(this);
        }
        async join(voiceChannel) {
            this.connection = { joinConfig: { channelId: voiceChannel.id } };
        }
        leave() {
            this.connection = null;
            this.readingChannels = [];
        }
        addReadingChannel(c) {
            if (!this.readingChannels.includes(c)) this.readingChannels.push(c);
        }
        push(stream) {
            this.queue.push(stream);
        }
        clearQueue() {
            this.queue = [];
        }
    }

    const voice = (opts = {}) => channel(Object.assign({ id: 'v1', type: ChannelType.GuildVoice }, opts));
    const text = (opts = {}) => channel(Object.assign({ id: 't1', type: ChannelType.GuildText }, opts));
    const join = (voiceChannelId = 'v1', textChannelId = 't1') =>
        new JoinVoiceAction({ id: 'a', voiceChannelId, textChannelId });
    const voiceResponse = (serverId = 'g1') => new VoiceResponse({ id: 'r', serverId, stream: new PassThrough() });

    beforeEach(() => {
        models = [];
        Manager = proxyquire('../../src/infra/discord/discord_voice_queue_manager', {
            './discord_voice_chat_model': FakeVoiceChatModel,
            '../../domain/repo/i_voice_status_repo': noComprise,
            '../../domain/repo/i_discord_voice_repo': noComprise,
            '../../domain/repo/i_discord_vc_action_repo': noComprise,
        });
    });

    describe('#postJoinVoice', () => {
        specify('通話に入り、読み上げチャンネルを登録して、音声ステータスに反映する', async () => {
            const mgr = new Manager(clientWith([voice(), text()]));
            await mgr.postJoinVoice(join());

            const status = await mgr.loadVoiceStatus('g1');
            status.serverId.should.equal('g1');
            status.voiceChannelId.should.equal('v1');
            status.readingChannelsId.should.deep.equal(['t1']);
            status.state.should.equal('ready');
        });

        specify('同じサーバーで入り直しても、通話のモデルは一つのまま', async () => {
            const mgr = new Manager(clientWith([voice(), text(), text({ id: 't2' })]));
            await mgr.postJoinVoice(join('v1', 't1'));
            await mgr.postJoinVoice(join('v1', 't2'));
            models.should.have.lengthOf(1);
            (await mgr.loadVoiceStatus('g1')).readingChannelsId.should.deep.equal(['t1', 't2']);
        });

        specify('通話チャンネルの中のチャットも読み上げ先にできる', async () => {
            const mgr = new Manager(clientWith([voice()]));
            await mgr.postJoinVoice(join('v1', 'v1'));
            (await mgr.loadVoiceStatus('g1')).readingChannelsId.should.deep.equal(['v1']);
        });

        const failures = [
            ['通話チャンネルが見つからない', [text()], 'unexpected', 'no-such-voice-channel'],
            [
                'ステージチャンネル',
                [voice({ type: ChannelType.GuildStageVoice }), text()],
                'disappointed',
                'unsupported-voice-channel',
            ],
            ['読み上げチャンネルが見つからない', [voice()], 'unexpected', 'no-such-text-channel'],
            [
                'スレッドを読み上げ先にしようとした',
                [voice(), text({ type: ChannelType.PublicThread })],
                'disappointed',
                'unsupported-text-channel',
            ],
            [
                '接続の権限がない',
                [voice({ missing: ['Connect', 'Speak'] }), text()],
                'disappointed',
                'missing-voice-permissions',
            ],
            [
                'タイムアウト中',
                [voice({ joinable: false, timedOut: true }), text()],
                'disappointed',
                'bot-is-timed-out',
            ],
            ['満員', [voice({ joinable: false }), text()], 'disappointed', 'voice-channel-is-full'],
        ];
        failures.forEach(([name, channels, type, reason]) => {
            specify(`${name}なら ${type}（${reason}）で通話に入らない`, async () => {
                const mgr = new Manager(clientWith(channels));
                const err = await mgr.postJoinVoice(join()).catch((e) => e);
                err.should.have.property('type', type);
                err.reason.should.include(reason);
                // 利用者向けの説明が message に入っている（既定の "[EbyXxxError] reason" ではない）
                err.message.should.not.match(/^\[Eby/);
                models.should.have.lengthOf(0);
            });
        });

        specify('権限が足りないときは、足りない権限を表示名で伝える', async () => {
            const mgr = new Manager(clientWith([voice({ missing: ['Connect', 'Speak'] }), text()]));
            const err = await mgr.postJoinVoice(join()).catch((e) => e);
            err.message.should.include('「接続」「発言」');
        });
    });

    describe('#loadVoiceStatus / #loadAllVoiceStatus', () => {
        specify('一度も入っていないサーバーは null', async () => {
            const mgr = new Manager(clientWith([]));
            ((await mgr.loadVoiceStatus('g1')) === null).should.equal(true);
            (await mgr.loadAllVoiceStatus()).should.deep.equal([]);
        });

        specify('抜けた後のサーバーは null になり、一覧からも消える', async () => {
            const mgr = new Manager(clientWith([voice(), text()]));
            await mgr.postJoinVoice(join());
            await mgr.postLeaveVoice(new LeaveVoiceAction({ id: 'a', serverId: 'g1' }));

            ((await mgr.loadVoiceStatus('g1')) === null).should.equal(true);
            (await mgr.loadAllVoiceStatus()).should.deep.equal([]);
        });

        specify('再生中なら speaking', async () => {
            const mgr = new Manager(clientWith([voice(), text()]));
            await mgr.postJoinVoice(join());
            models[0].dispatcher = {};
            (await mgr.loadVoiceStatus('g1')).state.should.equal('speaking');
        });

        specify('接続中のサーバーをすべて返す', async () => {
            const mgr = new Manager(
                clientWith([voice(), text(), voice({ id: 'v2', guildId: 'g2' }), text({ id: 't2', guildId: 'g2' })])
            );
            await mgr.postJoinVoice(join('v1', 't1'));
            await mgr.postJoinVoice(join('v2', 't2'));
            (await mgr.loadAllVoiceStatus()).map((s) => s.serverId).should.have.members(['g1', 'g2']);
        });
    });

    describe('#postVoice', () => {
        specify('接続中ならキューに積み、読み上げ回数を数える', async () => {
            const mgr = new Manager(clientWith([voice(), text()]));
            await mgr.postJoinVoice(join());
            const before = await mgr.loadReadCount();

            const res = voiceResponse();
            await mgr.postVoice(res);

            models[0].queue.should.deep.equal([res.stream]);
            (await mgr.loadReadCount()).should.equal(before + 1);
        });

        specify('一度も入っていないサーバー宛てなら、ストリームを破棄して unexpected', async () => {
            const mgr = new Manager(clientWith([]));
            const res = voiceResponse();
            const err = await mgr.postVoice(res).catch((e) => e);
            err.should.have.property('type', 'unexpected');
            res.stream.destroyed.should.equal(true);
        });

        specify('抜けた後のサーバー宛てなら、ストリームを破棄して abort し、回数は数えない', async () => {
            const mgr = new Manager(clientWith([voice(), text()]));
            await mgr.postJoinVoice(join());
            await mgr.postLeaveVoice(new LeaveVoiceAction({ id: 'a', serverId: 'g1' }));
            const before = await mgr.loadReadCount();

            const res = voiceResponse();
            const err = await mgr.postVoice(res).catch((e) => e);

            err.should.have.property('type', 'abort');
            res.stream.destroyed.should.equal(true);
            (await mgr.loadReadCount()).should.equal(before);
        });
    });

    describe('#postSeibai / #postLeaveVoice', () => {
        specify('成敗するとキューを空にし、再生中の音声を止める', async () => {
            const mgr = new Manager(clientWith([voice(), text()]));
            await mgr.postJoinVoice(join());
            await mgr.postVoice(voiceResponse());

            await mgr.postSeibai(new SeibaiAction({ id: 'a', serverId: 'g1' }));

            models[0].queue.should.deep.equal([]);
            models[0].killStream.calledOnce.should.equal(true);
        });

        specify('一度も入っていないサーバーでの成敗・退出は unexpected', async () => {
            const mgr = new Manager(clientWith([]));
            (await mgr.postSeibai(new SeibaiAction({ id: 'a', serverId: 'g1' })).catch((e) => e)).should.have.property(
                'type',
                'unexpected'
            );
            (
                await mgr.postLeaveVoice(new LeaveVoiceAction({ id: 'a', serverId: 'g1' })).catch((e) => e)
            ).should.have.property('type', 'unexpected');
        });
    });
});

describe('DiscordSendMessageManager', () => {
    let Manager;

    beforeEach(() => {
        Manager = proxyquire('../../src/infra/discord/discord_send_message_manager', {
            '../../domain/repo/i_discord_chat_repo': noComprise,
        });
    });

    const chat = (code = 'simple', channelId = 't1') =>
        new ChatResponse({ id: 'c', content: 'こんにちは', channelId, code });

    specify('テキストチャンネルに送る', async () => {
        const t = channel({ id: 't1', type: ChannelType.GuildText });
        await new Manager(clientWith([t])).postChat(chat());
        t.send.calledOnceWith('こんにちは').should.equal(true);
    });

    specify('通話チャンネルの中のチャットにも送れる', async () => {
        const v = channel({ id: 'v1', type: ChannelType.GuildVoice });
        await new Manager(clientWith([v])).postChat(chat('simple', 'v1'));
        v.send.calledOnce.should.equal(true);
    });

    specify('pager は 👈 → 👉 の順にリアクションを付ける', async () => {
        const sent = { react: sinon.stub().resolves() };
        const t = channel({ id: 't1', type: ChannelType.GuildText });
        t.send = sinon.stub().resolves(sent);

        await new Manager(clientWith([t])).postChat(chat('pager'));

        sent.react
            .getCalls()
            .map((c) => c.args[0])
            .should.deep.equal(['👈', '👉']);
    });

    specify('pager 以外にはリアクションを付けない', async () => {
        const sent = { react: sinon.stub().resolves() };
        const t = channel({ id: 't1', type: ChannelType.GuildText });
        t.send = sinon.stub().resolves(sent);
        await new Manager(clientWith([t])).postChat(chat('simple'));
        sent.react.called.should.equal(false);
    });

    specify('チャンネルが見つからない、またはテキストを送れない種類なら unexpected', async () => {
        const mgr = new Manager(clientWith([channel({ id: 'th', type: ChannelType.PublicThread })]));
        (await mgr.postChat(chat('simple', 'nope')).catch((e) => e)).should.have.property('type', 'unexpected');
        (await mgr.postChat(chat('simple', 'th')).catch((e) => e)).should.have.property('type', 'unexpected');
    });

    specify('送信の権限がなければ、送らずに理由つきの disappointed', async () => {
        const t = channel({ id: 't1', type: ChannelType.GuildText, missing: ['SendMessages'] });
        const err = await new Manager(clientWith([t])).postChat(chat()).catch((e) => e);
        err.should.have.property('type', 'disappointed');
        err.message.should.include('「メッセージを送信」');
        t.send.called.should.equal(false);
    });
});

describe('DiscordServerInfoManager', () => {
    let Manager;

    beforeEach(() => {
        Manager = proxyquire('../../src/infra/discord/discord_server_info_manager', {
            '../../domain/repo/i_server_status_repo': noComprise,
        });
    });

    const appSettings = { defaultCommandPrefix: '>', helpUrl: 'https://example.com/help' };

    specify('ギルドと全体設定からサーバーステータスを作る', async () => {
        const client = {
            guilds: { resolve: (id) => (id === 'g1' ? { id: 'g1', name: 'Guild' } : null) },
            user: { id: 'bot-id' },
        };
        const status = await new Manager(client, appSettings).loadServerStatus('g1');
        status.should.be.an.instanceOf(ServerStatus);
        status.serverId.should.equal('g1');
        status.serverName.should.equal('Guild');
        status.userId.should.equal('bot-id');
        status.prefix.should.equal('>');
        status.helpUrl.should.equal('https://example.com/help');
    });

    specify('花子が入っていないギルドなら unexpected', async () => {
        const client = { guilds: { resolve: () => null }, user: { id: 'bot-id' } };
        const err = await new Manager(client, appSettings).loadServerStatus('g1').catch((e) => e);
        err.should.have.property('type', 'unexpected');
    });
});

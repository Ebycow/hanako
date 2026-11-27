require('chai').should();
const sinon = require('sinon');
const { PassThrough } = require('stream');
const MessageBuilder = require('../../src/service/message_builder');
const MessageService = require('../../src/service/message_service');
const InteractionBuilder = require('../../src/service/interaction_builder');
const AutoLeaveService = require('../../src/service/auto_leave_service');
const StatusService = require('../../src/service/status_service');
const PagerService = require('../../src/service/pager_service');
const HanakoLoader = require('../../src/service/hanako_loader');
const LeaveVoiceAction = require('../../src/domain/entity/actions/leave_voice_action');
const VoiceResponse = require('../../src/domain/entity/responses/voice_response');
const {
    basicHanako,
    dmessageBlueprint,
    Hanako,
    Settings,
    ServerStatus,
    VoiceStatus,
    settingsBlueprint,
    serverStatusBlueprint,
    voiceStatusBlueprint,
    emptyWordDictionary,
    emptySilenceDictionary,
    emptyFoleyDictionary,
    DiscordMessage,
} = require('../helpers/blueprints');

const HANAKO_ID = 'hanako-user-id';

/** 花子（prefix '>'、読み上げチャンネル 'reading-ch'）を作る */
function hanako(overrides = {}) {
    return basicHanako(
        Object.assign(
            {
                serverStatus: { userId: HANAKO_ID, prefix: '>' },
                voiceStatus: { readingChannelsId: ['reading-ch'] },
            },
            overrides
        )
    );
}

describe('MessageBuilder', () => {
    const builder = new MessageBuilder();

    function param(overrides = {}) {
        return Object.assign(
            {
                id: 'm1',
                content: 'こんにちは',
                userId: 'u1',
                userName: 'user',
                channelId: 'reading-ch',
                channelName: 'general',
                serverId: 'mock-server-id',
                serverName: 'server',
                voiceChannelId: null,
                mentionedUsers: new Map(),
            },
            overrides
        );
    }

    specify('読み上げチャンネルの普通の発言は read になる', async () => {
        const dm = await builder.build(hanako(), param());
        dm.should.be.an.instanceOf(DiscordMessage);
        dm.type.should.equal('read');
        dm.content.should.equal('こんにちは');
        dm.channelId.should.equal('reading-ch');
    });

    specify('プレフィックスで始まる発言は、どのチャンネルでも command になる', async () => {
        const dm = await builder.build(hanako(), param({ content: '>help', channelId: 'other-ch' }));
        dm.type.should.equal('command');
    });

    specify('花子へのメンションを含む発言は command になる', async () => {
        const mentionedUsers = new Map([['hanako', HANAKO_ID]]);
        const dm = await builder.build(
            hanako(),
            param({ content: '@hanako help', channelId: 'other-ch', mentionedUsers })
        );
        dm.type.should.equal('command');
    });

    specify('ほかの人へのメンションだけでは command にならない', async () => {
        const mentionedUsers = new Map([['someone', 'u2']]);
        const dm = await builder.build(hanako(), param({ mentionedUsers }));
        dm.type.should.equal('read');
    });

    specify('読み上げチャンネル以外の普通の発言は abort で無視する', async () => {
        const err = await builder.build(hanako(), param({ channelId: 'other-ch' })).catch((e) => e);
        err.should.have.property('type', 'abort');
    });

    specify('通話に入っていない花子は、どのチャンネルの普通の発言も無視する', async () => {
        const err = await builder.build(hanako({ voiceStatus: null }), param()).catch((e) => e);
        err.should.have.property('type', 'abort');
    });

    specify('添付ファイルと権限を引き継ぎ、省略時は空配列にする', async () => {
        const attachments = [{ name: 'a.wav', url: 'https://example.com/a.wav' }];
        const withAll = await builder.build(hanako(), param({ attachments, memberPermissions: ['manage'] }));
        withAll.attachments.should.deep.equal(attachments);
        withAll.memberPermissions.should.deep.equal(['manage']);

        const without = await builder.build(hanako(), param());
        without.attachments.should.deep.equal([]);
        without.memberPermissions.should.deep.equal([]);
    });
});

describe('InteractionBuilder', () => {
    specify('スラッシュコマンドを interaction 型のメッセージにする', async () => {
        const dm = await new InteractionBuilder().build(hanako(), {
            id: 'i1',
            commandName: 'word',
            commandArgs: { from: 'a', to: 'b' },
            userId: 'u1',
            userName: 'user',
            channelId: 'c1',
            channelName: 'general',
            serverId: 'mock-server-id',
            serverName: 'server',
            voiceChannelId: 'v1',
        });
        dm.type.should.equal('interaction');
        dm.content.should.equal('word');
        dm.commandArgs.should.deep.equal({ from: 'a', to: 'b' });
        dm.voiceChannelId.should.equal('v1');
        dm.mentionedUsers.size.should.equal(0);
    });
});

describe('MessageService', () => {
    let deps;
    let service;
    const response = { type: 'chat' };

    beforeEach(() => {
        deps = {
            commandParser: { parse: sinon.stub().resolves('cmd-input') },
            commandInvoker: { invoke: sinon.stub().resolves(response) },
            interactionParser: { parse: sinon.stub().resolves('itr-input') },
            messageReader: { read: sinon.stub().resolves(['audio']) },
            streamFetcher: { fetch: sinon.stub().resolves(new PassThrough()) },
        };
        service = new MessageService(
            deps.commandParser,
            deps.commandInvoker,
            deps.interactionParser,
            deps.messageReader,
            deps.streamFetcher
        );
    });

    specify('command はテキストとして解析してから実行する', async () => {
        const h = hanako();
        const res = await service.serve(h, dmessageBlueprint({ type: 'command' }));
        res.should.equal(response);
        deps.commandParser.parse.calledOnce.should.equal(true);
        deps.interactionParser.parse.called.should.equal(false);
        deps.commandInvoker.invoke.calledWith(h, 'cmd-input').should.equal(true);
    });

    specify('interaction はスラッシュコマンドとして解析してから実行する', async () => {
        const h = hanako();
        const res = await service.serve(h, dmessageBlueprint({ type: 'interaction', commandArgs: {} }));
        res.should.equal(response);
        deps.commandParser.parse.called.should.equal(false);
        deps.commandInvoker.invoke.calledWith(h, 'itr-input').should.equal(true);
    });

    specify('read は読み上げ音声を作り、サーバー宛ての VoiceResponse を返す', async () => {
        const dm = dmessageBlueprint({ type: 'read', id: 'm9', serverId: 's9' });
        const res = await service.serve(hanako(), dm);

        res.should.be.an.instanceOf(VoiceResponse);
        res.id.should.equal('m9');
        res.serverId.should.equal('s9');
        deps.streamFetcher.fetch.calledWith(['audio']).should.equal(true);
        deps.commandInvoker.invoke.called.should.equal(false);
    });

    specify('解析のエラーはそのまま返す', async () => {
        const boom = new Error('parse');
        deps.commandParser.parse.rejects(boom);
        const err = await service.serve(hanako(), dmessageBlueprint({ type: 'command' })).catch((e) => e);
        err.should.equal(boom);
    });
});

describe('AutoLeaveService', () => {
    let actionHandler;
    let service;
    const data = (voiceChannelMembersId) => ({ serverName: 's', voiceChannelName: 'v', voiceChannelMembersId });

    beforeEach(() => {
        actionHandler = { handle: sinon.stub().resolves() };
        service = new AutoLeaveService(actionHandler);
    });

    specify('花子しか残っていなければ退出する', async () => {
        await service.serve(hanako(), data([HANAKO_ID]));
        actionHandler.handle.calledOnce.should.equal(true);
        const action = actionHandler.handle.firstCall.args[0];
        action.should.be.an.instanceOf(LeaveVoiceAction);
        action.serverId.should.equal('mock-server-id');
    });

    specify('ほかに誰かいれば abort で退出しない', async () => {
        const err = await service.serve(hanako(), data([HANAKO_ID, 'u1'])).catch((e) => e);
        err.should.have.property('type', 'abort');
        actionHandler.handle.called.should.equal(false);
    });

    specify('花子がいないチャンネルなら disappointed', async () => {
        const err = await service.serve(hanako(), data(['u1'])).catch((e) => e);
        err.should.have.property('type', 'disappointed');
        actionHandler.handle.called.should.equal(false);
    });

    specify('誰もいなければ disappointed（すでに花子もいない）', async () => {
        const err = await service.serve(hanako(), data([])).catch((e) => e);
        err.should.have.property('type', 'disappointed');
    });
});

describe('StatusService', () => {
    specify('プレフィックス付きの help と読み上げ回数を表示する', async () => {
        const voiceStatusRepo = { loadReadCount: sinon.stub().resolves(12) };
        const text = await new StatusService(voiceStatusRepo, { defaultCommandPrefix: '!' }).serve();
        text.should.equal('!help | 12回読んだ！');
    });
});

describe('PagerService', () => {
    function fakePager() {
        let page = 0;
        return {
            forward: sinon.spy(() => page++),
            backward: sinon.spy(() => page--),
            show: () => `page ${page}`,
        };
    }

    specify('forward でページを進め、そのページを返す', async () => {
        const pager = fakePager();
        (await new PagerService().serve(pager, 'forward')).should.equal('page 1');
        pager.backward.called.should.equal(false);
    });

    specify('backward でページを戻し、そのページを返す', async () => {
        const pager = fakePager();
        (await new PagerService().serve(pager, 'backward')).should.equal('page -1');
        pager.forward.called.should.equal(false);
    });

    specify('ほかの方向は受け付けない', async () => {
        const err = await new PagerService().serve(fakePager(), 'up').catch((e) => e);
        err.should.be.an.instanceOf(Error);
    });
});

describe('HanakoLoader', () => {
    specify('各リポジトリから同じサーバーの構成要素を集めて花子を組み立てる', async () => {
        const serverId = 'mock-server-id';
        const repos = {
            settings: { loadSettings: sinon.stub().resolves(new Settings(settingsBlueprint())) },
            serverStatus: {
                loadServerStatus: sinon.stub().resolves(new ServerStatus(serverStatusBlueprint({ userId: HANAKO_ID }))),
            },
            voiceStatus: { loadVoiceStatus: sinon.stub().resolves(new VoiceStatus(voiceStatusBlueprint())) },
            word: { loadWordDictionary: sinon.stub().resolves(emptyWordDictionary()) },
            silence: { loadSilenceDictionary: sinon.stub().resolves(emptySilenceDictionary()) },
            foley: { loadFoleyDictionary: sinon.stub().resolves(emptyFoleyDictionary()) },
        };
        const loader = new HanakoLoader(
            repos.settings,
            repos.serverStatus,
            repos.voiceStatus,
            repos.word,
            repos.silence,
            repos.foley
        );

        const h = await loader.load(serverId);

        h.should.be.an.instanceOf(Hanako);
        h.userId.should.equal(HANAKO_ID);
        repos.settings.loadSettings.calledWith(serverId).should.equal(true);
        repos.serverStatus.loadServerStatus.calledWith(serverId).should.equal(true);
        repos.voiceStatus.loadVoiceStatus.calledWith(serverId).should.equal(true);
        repos.word.loadWordDictionary.calledWith(serverId).should.equal(true);
        repos.silence.loadSilenceDictionary.calledWith(serverId).should.equal(true);
        repos.foley.loadFoleyDictionary.calledWith(serverId).should.equal(true);
    });

    specify('通話に入っていなければ音声ステータスなしの花子になる', async () => {
        const loader = new HanakoLoader(
            { loadSettings: async () => new Settings(settingsBlueprint()) },
            { loadServerStatus: async () => new ServerStatus(serverStatusBlueprint()) },
            { loadVoiceStatus: async () => null },
            { loadWordDictionary: async () => emptyWordDictionary() },
            { loadSilenceDictionary: async () => emptySilenceDictionary() },
            { loadFoleyDictionary: async () => emptyFoleyDictionary() }
        );
        const h = await loader.load('mock-server-id');
        h.isReadingChannel('mock-reading-channel-id').should.equal(false);
    });
});

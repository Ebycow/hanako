require('chai').should();
const sinon = require('sinon');
const RecoveryService = require('../../src/service/recovery_service');
const RecoverySupervisor = require('../../src/service/recovery_supervisor');
const RecoveryInfo = require('../../src/domain/entity/recovery_info');
const JoinVoiceAction = require('../../src/domain/entity/actions/join_voice_action');
const LeaveVoiceAction = require('../../src/domain/entity/actions/leave_voice_action');
const ChatResponse = require('../../src/domain/entity/responses/chat_response');
const { ServerStatus, VoiceStatus, serverStatusBlueprint, voiceStatusBlueprint } = require('../helpers/blueprints');

/************************************************************************
 * 再起動をまたいだボイスチャット復帰
 *
 * RecoverySupervisor が終了時に「どこにいたか」を保存し、
 * RecoveryService が起動時にそこへ戻る。この往復を両側からテストする。
 ***********************************************************************/

const info = (serverId, voiceChannelId, textChannelId) =>
    new RecoveryInfo({ id: `ri-${serverId}`, serverId, voiceChannelId, readingChannelsId: [textChannelId] });

describe('RecoveryService', () => {
    let recoveryInfoRepo;
    let serverStatusRepo;
    let chatRepo;
    let actionHandler;
    let service;

    beforeEach(() => {
        recoveryInfoRepo = {
            loadAllRecoveryInfo: sinon.stub().resolves([]),
            deleteAllRecoveryInfo: sinon.stub().resolves(),
        };
        serverStatusRepo = {
            loadServerStatus: sinon
                .stub()
                .callsFake(
                    async (serverId) => new ServerStatus(serverStatusBlueprint({ serverId, userId: 'hanako-id' }))
                ),
        };
        chatRepo = { postChat: sinon.stub().resolves() };
        actionHandler = { handle: sinon.stub().resolves() };
        service = new RecoveryService(recoveryInfoRepo, serverStatusRepo, chatRepo, actionHandler);
    });

    specify('復帰情報がなければ何もせず、復帰情報を消して終わる', async () => {
        await service.serve();
        actionHandler.handle.called.should.equal(false);
        chatRepo.postChat.called.should.equal(false);
        recoveryInfoRepo.deleteAllRecoveryInfo.calledOnce.should.equal(true);
    });

    specify('保存されていた通話チャンネルへ入り直し、前後に読み上げチャンネルで知らせる', async () => {
        recoveryInfoRepo.loadAllRecoveryInfo.resolves([info('s1', 'v1', 't1')]);

        await service.serve();

        actionHandler.handle.calledOnce.should.equal(true);
        const action = actionHandler.handle.firstCall.args[0];
        action.should.be.an.instanceOf(JoinVoiceAction);
        action.voiceChannelId.should.equal('v1');
        action.textChannelId.should.equal('t1');

        chatRepo.postChat.callCount.should.equal(2);
        const [before, after] = chatRepo.postChat.getCalls().map((c) => c.args[0]);
        before.should.be.an.instanceOf(ChatResponse);
        before.channelId.should.equal('t1');
        before.content.should.include('<@hanako-id>');
        after.channelId.should.equal('t1');
        after.content.should.include('<#t1>');

        sinon.assert.callOrder(chatRepo.postChat, actionHandler.handle, recoveryInfoRepo.deleteAllRecoveryInfo);
        chatRepo.postChat.secondCall.calledAfter(actionHandler.handle.firstCall).should.equal(true);
    });

    specify('一つのサーバーで失敗しても、ほかのサーバーは復帰し、復帰情報は消す', async () => {
        recoveryInfoRepo.loadAllRecoveryInfo.resolves([info('s1', 'v1', 't1'), info('s2', 'v2', 't2')]);
        actionHandler.handle.callsFake(async (action) => {
            if (action.voiceChannelId === 'v1') throw new Error('join failed');
        });

        await service.serve();

        actionHandler.handle.callCount.should.equal(2);
        // s2 だけ「再開しました」まで送れている
        const endings = chatRepo.postChat
            .getCalls()
            .map((c) => c.args[0])
            .filter((r) => r.content.includes('再開'));
        endings.map((r) => r.channelId).should.deep.equal(['t2']);
        recoveryInfoRepo.deleteAllRecoveryInfo.calledOnce.should.equal(true);
    });

    specify('サーバー情報が取れなければ、そのサーバーには入らない', async () => {
        recoveryInfoRepo.loadAllRecoveryInfo.resolves([info('s1', 'v1', 't1')]);
        serverStatusRepo.loadServerStatus.rejects(new Error('gone'));

        await service.serve();

        actionHandler.handle.called.should.equal(false);
        recoveryInfoRepo.deleteAllRecoveryInfo.calledOnce.should.equal(true);
    });
});

describe('RecoverySupervisor', () => {
    let voiceStatusRepo;
    let recoveryInfoRepo;
    let shutdownDelegator;
    let actionHandler;
    let onShutdown;

    const vs = (serverId, voiceChannelId, readingChannelsId) =>
        new VoiceStatus(voiceStatusBlueprint({ id: `vs-${serverId}`, serverId, voiceChannelId, readingChannelsId }));

    beforeEach(async () => {
        voiceStatusRepo = { loadAllVoiceStatus: sinon.stub().resolves([]) };
        recoveryInfoRepo = { saveRecoveryInfo: sinon.stub().resolves() };
        shutdownDelegator = { delegate: sinon.stub().callsFake((fn) => (onShutdown = fn)) };
        actionHandler = { handle: sinon.stub().resolves() };
        onShutdown = null;
        await new RecoverySupervisor(voiceStatusRepo, recoveryInfoRepo, shutdownDelegator, actionHandler).supervise();
    });

    specify('#supervise は終了時の処理を一つだけ登録する', () => {
        shutdownDelegator.delegate.calledOnce.should.equal(true);
        onShutdown.should.be.a('function');
    });

    specify('終了時、接続中のすべての通話から抜け、その場所を復帰情報として保存する', async () => {
        voiceStatusRepo.loadAllVoiceStatus.resolves([vs('s1', 'v1', ['t1']), vs('s2', 'v2', ['t2', 't3'])]);

        await onShutdown();

        actionHandler.handle.callCount.should.equal(2);
        actionHandler.handle.getCalls().forEach((c) => c.args[0].should.be.an.instanceOf(LeaveVoiceAction));
        actionHandler.handle
            .getCalls()
            .map((c) => c.args[0].serverId)
            .should.have.members(['s1', 's2']);

        const saved = recoveryInfoRepo.saveRecoveryInfo.getCalls().map((c) => c.args[0]);
        saved.should.have.lengthOf(2);
        saved.find((x) => x.serverId === 's2').should.include({ voiceChannelId: 'v2' });
        saved.find((x) => x.serverId === 's2').readingChannelsId.should.deep.equal(['t2', 't3']);
    });

    specify('通話から抜けるのに失敗しても、復帰情報は保存する', async () => {
        voiceStatusRepo.loadAllVoiceStatus.resolves([vs('s1', 'v1', ['t1'])]);
        actionHandler.handle.rejects(new Error('leave failed'));

        await onShutdown();

        recoveryInfoRepo.saveRecoveryInfo.calledOnce.should.equal(true);
    });

    specify('接続中の通話がなければ何も保存しない', async () => {
        await onShutdown();
        recoveryInfoRepo.saveRecoveryInfo.called.should.equal(false);
    });

    specify('保存した復帰情報で RecoveryService が同じ場所へ戻る（往復）', async () => {
        voiceStatusRepo.loadAllVoiceStatus.resolves([vs('s1', 'v1', ['t1'])]);
        await onShutdown();
        const saved = recoveryInfoRepo.saveRecoveryInfo.getCalls().map((c) => c.args[0]);

        const joinHandler = { handle: sinon.stub().resolves() };
        const service = new RecoveryService(
            { loadAllRecoveryInfo: sinon.stub().resolves(saved), deleteAllRecoveryInfo: sinon.stub().resolves() },
            { loadServerStatus: async (serverId) => new ServerStatus(serverStatusBlueprint({ serverId })) },
            { postChat: sinon.stub().resolves() },
            joinHandler
        );
        await service.serve();

        const join = joinHandler.handle.firstCall.args[0];
        join.voiceChannelId.should.equal('v1');
        join.textChannelId.should.equal('t1');
    });
});

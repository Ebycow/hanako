const should = require('chai').should();
const sinon = require('sinon');
const proxyquire = require('proxyquire').noCallThru();
const ChatResponse = require('../../src/domain/entity/responses/chat_response');
const EbyDisappointedError = require('../../src/core/errors/eby_disappointed_error');
const { MessageFlags } = require('discord.js');

/**
 * Promiseが失敗したときのエラーを取り出す（成功したらテスト失敗）
 *
 * @param {Promise<any>} promise
 * @returns {Promise<any>}
 */
async function captureRejection(promise) {
    try {
        await promise;
    } catch (e) {
        return e;
    }
    throw new Error('rejected されるはずが resolved された');
}

describe('InteractionCtrl', () => {
    let sandbox;
    let builderBuild;
    let serviceServe;
    let responseHandle;
    let hanakoLoad;
    let InteractionCtrl;

    function loadSubject() {
        class InteractionBuilderStub {
            async build(...args) {
                return builderBuild(...args);
            }
        }

        class MessageServiceStub {
            async serve(...args) {
                return serviceServe(...args);
            }
        }

        class ResponseHandlerStub {
            async handle(...args) {
                return responseHandle(...args);
            }
        }

        class HanakoLoaderStub {
            async load(...args) {
                return hanakoLoad(...args);
            }
        }

        InteractionCtrl = proxyquire('../../src/app/interaction_ctrl', {
            '../service/interaction_builder': InteractionBuilderStub,
            '../service/message_service': MessageServiceStub,
            '../service/response_handler': ResponseHandlerStub,
            '../service/hanako_loader': HanakoLoaderStub,
        });
    }

    function interactionBlueprint(overrides = {}) {
        return Object.assign(
            {
                id: 'interaction-id',
                commandName: 'ask',
                options: { data: [] },
                user: {
                    id: 'alice-id',
                    username: 'alice',
                },
                channel: {
                    id: 'channel-id',
                    name: 'general',
                },
                guildId: 'guild-id',
                guild: {
                    id: 'guild-id',
                    name: 'guild-name',
                    members: { cache: new Map() },
                    roles: { cache: new Map() },
                    channels: { cache: new Map() },
                },
                member: {
                    voice: {
                        channel: null,
                    },
                },
                isChatInputCommand: () => true,
                inCachedGuild: () => true,
                reply: sandbox.stub().resolves(),
                deferReply: sandbox.stub().resolves(),
                editReply: sandbox.stub().resolves(),
                deleteReply: sandbox.stub().resolves(),
            },
            overrides
        );
    }

    beforeEach(() => {
        sandbox = sinon.createSandbox();
        builderBuild = sandbox.stub().resolves({ id: 'entity-id' });
        serviceServe = sandbox.stub().resolves({ type: 'silent' });
        responseHandle = sandbox.stub().resolves();
        hanakoLoad = sandbox.stub().resolves({ prefix: '>' });
        loadSubject();
    });

    afterEach(() => {
        sandbox.restore();
    });

    specify('スラッシュコマンド名とオプションを文字列に戻さず名前付きの引数として渡す', async () => {
        const ctrl = new InteractionCtrl({});
        const interaction = interactionBlueprint({
            commandName: 'teach',
            options: {
                data: [
                    { type: 3, name: 'from', value: 'Hello World' },
                    { type: 3, name: 'to', value: 'ハロー　ワールド' },
                ],
            },
        });

        await ctrl.onInteraction(interaction);

        const builderParam = builderBuild.firstCall.args[1];
        builderParam.commandName.should.equal('teach');
        builderParam.commandArgs.should.deep.equal({ from: 'Hello World', to: 'ハロー　ワールド' });
    });

    specify('文字列のオプションはテキスト投稿と同じ標準化をかける', async () => {
        const ctrl = new InteractionCtrl({});
        const interaction = interactionBlueprint({
            commandName: 'teach',
            options: {
                data: [
                    { type: 3, name: 'from', value: '<:donut:123456789>' },
                    { type: 3, name: 'to', value: '<@12345>🍙' },
                ],
            },
        });
        interaction.guild.members.cache.set('12345', { displayName: 'ボブ' });

        await ctrl.onInteraction(interaction);

        const builderParam = builderBuild.firstCall.args[1];
        builderParam.commandArgs.should.deep.equal({ from: ':donut:', to: '@ボブ:おにぎり:' });
    });

    specify('数値のオプションは型を保ったまま渡す', async () => {
        const ctrl = new InteractionCtrl({});
        const interaction = interactionBlueprint({
            commandName: 'limit',
            options: { data: [{ type: 4, name: 'number', value: 30 }] },
        });

        await ctrl.onInteraction(interaction);

        builderBuild.firstCall.args[1].commandArgs.should.deep.equal({ number: 30 });
    });

    specify('添付ファイルのオプションは attachments にまとめる', async () => {
        const ctrl = new InteractionCtrl({});
        const interaction = interactionBlueprint({
            commandName: 'se-add',
            options: {
                data: [
                    { type: 3, name: 'keyword', value: 'ドンッ' },
                    { type: 11, name: 'file', attachment: { name: 'don.mp3', url: 'https://cdn.example/don.mp3' } },
                ],
            },
        });

        await ctrl.onInteraction(interaction);

        builderBuild.firstCall.args[1].commandArgs.should.deep.equal({
            keyword: 'ドンッ',
            attachments: [{ name: 'don.mp3', url: 'https://cdn.example/don.mp3' }],
        });
    });

    specify('通常レスポンスより先に実行ログが投稿される', async () => {
        const ctrl = new InteractionCtrl({});
        const serviceResponse = {
            type: 'chat',
            id: 'response-id',
            content: 'ok',
            code: 'simple',
            channelId: 'channel-id',
        };
        serviceServe.resolves(serviceResponse);
        const interaction = interactionBlueprint({
            commandName: 'se-add',
            options: {
                data: [
                    { type: 3, name: 'keyword', value: 'key' },
                    { type: 3, name: 'url', value: 'https://example.com/a.mp3' },
                ],
            },
        });

        await ctrl.onInteraction(interaction);

        responseHandle.callCount.should.equal(2);
        const logResponse = responseHandle.firstCall.args[0];
        logResponse.should.be.instanceOf(ChatResponse);
        logResponse.content.should.equal('aliceが「/se-add keyword:key url:https://example.com/a.mp3」を実行したよ！');
        responseHandle.secondCall.args[0].should.equal(serviceResponse);
    });

    specify('user オプションはユーザーIDとサーバーでの表示名にする', async () => {
        const ctrl = new InteractionCtrl({});
        const interaction = interactionBlueprint({
            commandName: 'blacklist-add',
            options: {
                data: [
                    {
                        type: 6,
                        name: 'user',
                        value: 'bob-id',
                        user: { username: 'bob' },
                        member: { displayName: 'ボブ' },
                    },
                ],
            },
        });

        await ctrl.onInteraction(interaction);

        builderBuild.firstCall.args[1].commandArgs.should.deep.equal({ user: { id: 'bob-id', name: 'ボブ' } });
    });

    specify('ログ投稿に失敗してもメインのレスポンス処理は継続する', async () => {
        const ctrl = new InteractionCtrl({});
        const serviceResponse = { type: 'silent' };
        serviceServe.resolves(serviceResponse);
        responseHandle.onFirstCall().rejects(new Error('log failed'));
        responseHandle.onSecondCall().resolves();
        const interaction = interactionBlueprint({
            commandName: 'ask',
        });

        await ctrl.onInteraction(interaction);

        responseHandle.callCount.should.equal(2);
        responseHandle.secondCall.args[0].should.equal(serviceResponse);
        interaction.editReply.calledOnce.should.be.true;
        interaction.editReply.firstCall.args[0].should.have.string('実行しました');
    });

    specify('処理より先に実行者だけに見える形で応答を保留する（3秒制限対策）', async () => {
        const ctrl = new InteractionCtrl({});
        const interaction = interactionBlueprint();
        serviceServe.callsFake(async () => {
            // 処理が始まる時点で応答の保留が済んでいる
            interaction.deferReply.calledOnce.should.be.true;
            return { type: 'silent' };
        });

        await ctrl.onInteraction(interaction);

        interaction.deferReply.firstCall.args[0].should.have.property('flags', MessageFlags.Ephemeral);
        interaction.reply.called.should.be.false;
    });

    specify('処理に失敗したら失敗を応答し、エラーは上位に伝える', async () => {
        const ctrl = new InteractionCtrl({});
        const interaction = interactionBlueprint();
        const error = new Error('boom');
        serviceServe.rejects(error);

        (await captureRejection(ctrl.onInteraction(interaction))).should.equal(error);

        interaction.editReply.firstCall.args[0].should.have.string('失敗しました');
    });

    specify('アクションが失敗して onFailure が処理されたら失敗を応答する', async () => {
        const ctrl = new InteractionCtrl({});
        const interaction = interactionBlueprint();
        responseHandle.onSecondCall().resolves(false);

        await ctrl.onInteraction(interaction);

        interaction.editReply.firstCall.args[0].should.have.string('失敗しました');
    });

    specify('説明付きの EbyDisappointedError なら理由も応答に含める', async () => {
        const ctrl = new InteractionCtrl({});
        const interaction = interactionBlueprint();
        const error = new EbyDisappointedError('missing-text-permissions', '権限がないみたい');
        responseHandle.onSecondCall().rejects(error);

        (await captureRejection(ctrl.onInteraction(interaction))).should.equal(error);

        interaction.editReply.firstCall.args[0].should.have.string('権限がないみたい');
    });

    specify('スラッシュコマンド以外のインタラクションは何もせず中断する', async () => {
        const ctrl = new InteractionCtrl({});
        const interaction = interactionBlueprint({ isChatInputCommand: () => false });

        const err = await captureRejection(ctrl.onInteraction(interaction));

        err.type.should.equal('abort');
        interaction.deferReply.called.should.be.false;
        hanakoLoad.called.should.be.false;
    });

    specify('サーバー外（DM等）からの実行はその旨を応答して処理しない', async () => {
        const ctrl = new InteractionCtrl({});
        const interaction = interactionBlueprint({ inCachedGuild: () => false, guild: null });

        await ctrl.onInteraction(interaction);

        interaction.reply.calledOnce.should.be.true;
        interaction.reply.firstCall.args[0].should.have.property('flags', MessageFlags.Ephemeral);
        interaction.deferReply.called.should.be.false;
        hanakoLoad.called.should.be.false;
    });
});

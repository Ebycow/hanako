const should = require('chai').should();
const sinon = require('sinon');
const proxyquire = require('proxyquire').noCallThru();
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
    let respond;
    let replyFailure;
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

        class InteractionResponderStub {
            static commandReplyTarget(interaction, ephemeral) {
                return { interaction, ephemeral };
            }
            async respond(...args) {
                return respond(...args);
            }
            async replyFailure(...args) {
                return replyFailure(...args);
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
            '../service/interaction_responder': InteractionResponderStub,
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
        respond = sandbox.stub().resolves(true);
        replyFailure = sandbox.stub().resolves();
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

    specify('コマンドのレスポンスはインタラクションへの返信として返す', async () => {
        const ctrl = new InteractionCtrl({});
        const serviceResponse = { type: 'chat', code: 'simple', content: 'はい' };
        serviceServe.resolves(serviceResponse);
        const interaction = interactionBlueprint({ commandName: 'ask' });

        await ctrl.onInteraction(interaction);

        respond.calledOnce.should.be.true;
        respond.firstCall.args[0].should.deep.equal({ interaction, ephemeral: false });
        respond.firstCall.args[1].should.equal(serviceResponse);
    });

    specify('皆に関係するコマンドは処理より先に公開で応答を保留する（3秒制限対策）', async () => {
        const ctrl = new InteractionCtrl({});
        const interaction = interactionBlueprint({ commandName: 'ask' });
        serviceServe.callsFake(async () => {
            // 処理が始まる時点で応答の保留が済んでいる
            interaction.deferReply.calledOnce.should.be.true;
            return { type: 'silent' };
        });

        await ctrl.onInteraction(interaction);

        should.not.exist(interaction.deferReply.firstCall.args[0].flags);
        interaction.reply.called.should.be.false;
    });

    specify('一覧や検索のコマンドは実行者にだけ見える形で応答を保留する', async () => {
        const ctrl = new InteractionCtrl({});
        const interaction = interactionBlueprint({ commandName: 'dictionary' });

        await ctrl.onInteraction(interaction);

        interaction.deferReply.firstCall.args[0].should.have.property('flags', MessageFlags.Ephemeral);
        respond.firstCall.args[0].ephemeral.should.equal(true);
    });

    specify('処理に失敗したら失敗を応答し、エラーは上位に伝える', async () => {
        const ctrl = new InteractionCtrl({});
        const interaction = interactionBlueprint();
        const error = new Error('boom');
        serviceServe.rejects(error);

        (await captureRejection(ctrl.onInteraction(interaction))).should.equal(error);

        replyFailure.calledOnce.should.be.true;
        replyFailure.firstCall.args[1].should.equal(error);
    });

    specify('返信中に失敗しても失敗を応答し、エラーは上位に伝える', async () => {
        const ctrl = new InteractionCtrl({});
        const interaction = interactionBlueprint();
        const error = new Error('action failed');
        respond.rejects(error);

        (await captureRejection(ctrl.onInteraction(interaction))).should.equal(error);

        replyFailure.calledOnce.should.be.true;
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

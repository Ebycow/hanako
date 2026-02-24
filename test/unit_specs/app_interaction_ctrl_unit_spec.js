const should = require('chai').should();
const sinon = require('sinon');
const proxyquire = require('proxyquire').noCallThru();
const ChatResponse = require('../../src/domain/entity/responses/chat_response');

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
                },
                member: {
                    voice: {
                        channel: null,
                    },
                },
                reply: sandbox.stub().resolves(),
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

    specify('実行内容の構築時にスラッシュコマンド名が変換される', async () => {
        const ctrl = new InteractionCtrl({});
        const interaction = interactionBlueprint({
            commandName: 'se-search',
            options: {
                data: [{ type: 3, name: 'keyword', value: 'foo' }],
            },
        });

        await ctrl.onInteraction(interaction);

        const builderParam = builderBuild.firstCall.args[1];
        builderParam.content.should.equal('>se? foo');
    });

    specify('変換後のコマンドテキストで通常レスポンスより先に実行ログが投稿される', async () => {
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
        logResponse.content.should.equal('aliceが「>se-add key https://example.com/a.mp3」を実行したよ！');
        responseHandle.secondCall.args[0].should.equal(serviceResponse);
    });

    specify('user オプションが @username に変換され、mentionedUsers マップが保持される', async () => {
        const ctrl = new InteractionCtrl({});
        const interaction = interactionBlueprint({
            commandName: 'blacklist-add',
            options: {
                data: [{ type: 6, name: 'user', value: 'bob-id', user: { username: 'Bob' } }],
            },
        });

        await ctrl.onInteraction(interaction);

        const builderParam = builderBuild.firstCall.args[1];
        builderParam.content.should.equal('>blacklist-add @Bob');
        builderParam.mentionedUsers.get('Bob').should.equal('bob-id');
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
        interaction.reply.calledOnce.should.be.true;
        interaction.reply.firstCall.args[1].should.deep.equal({ ephemeral: true });
    });

    specify('不明なスラッシュコマンド名は同名のテキストコマンド名にフォールバックする', async () => {
        const ctrl = new InteractionCtrl({});
        const interaction = interactionBlueprint({
            commandName: 'unknown-command',
        });

        await ctrl.onInteraction(interaction);

        const builderParam = builderBuild.firstCall.args[1];
        builderParam.content.should.equal('>unknown-command');
    });
});

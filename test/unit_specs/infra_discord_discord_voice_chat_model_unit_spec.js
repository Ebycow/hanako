const should = require('chai').should();
const sinon = require('sinon');
const proxyquire = require('proxyquire').noCallThru();
const { EventEmitter } = require('events');

describe('DiscordVoiceChatModel', () => {
    const VoiceConnectionStatus = {
        Disconnected: 'disconnected',
        Signalling: 'signalling',
        Connecting: 'connecting',
        Ready: 'ready',
    };

    let clock;
    let DiscordVoiceChatModel;
    let joinVoiceChannel;
    let createAudioPlayer;
    let createAudioResource;
    let entersState;
    let connections;
    let audioPlayers;

    function flushPromises(times = 8) {
        let promise = Promise.resolve();
        for (let i = 0; i < times; i++) {
            promise = promise.then(() => Promise.resolve());
        }
        return promise;
    }

    function voiceChannel(id = 'voice-1') {
        return {
            id,
            guildId: 'guild-1',
            guild: {
                voiceAdapterCreator: {},
            },
        };
    }

    function textChannel(id = 'text-1') {
        return { id };
    }

    function makeConnection(config) {
        const connection = new EventEmitter();
        connection.joinConfig = {
            channelId: config.channelId,
        };
        connection.subscribe = sinon.stub().returns({ unsubscribe: sinon.stub() });
        connection.destroy = sinon.stub();
        connection.rejoin = sinon.stub();
        return connection;
    }

    function makeAudioPlayer() {
        const audioPlayer = new EventEmitter();
        audioPlayer.play = sinon.stub();
        audioPlayer.stop = sinon.stub();
        return audioPlayer;
    }

    beforeEach(() => {
        clock = sinon.useFakeTimers();
        connections = [];
        audioPlayers = [];

        joinVoiceChannel = sinon.stub().callsFake((config) => {
            const connection = makeConnection(config);
            connections.push(connection);
            return connection;
        });
        createAudioPlayer = sinon.stub().callsFake(() => {
            const audioPlayer = makeAudioPlayer();
            audioPlayers.push(audioPlayer);
            return audioPlayer;
        });
        createAudioResource = sinon.stub().callsFake((stream) => ({ stream }));
        entersState = sinon.stub();

        DiscordVoiceChatModel = proxyquire('../../src/infra/discord/discord_voice_chat_model', {
            '@discordjs/voice': {
                joinVoiceChannel,
                createAudioPlayer,
                createAudioResource,
                NoSubscriberBehavior: { Stop: 'stop' },
                StreamType: { Raw: 'raw' },
                AudioPlayerStatus: { Idle: 'idle' },
                VoiceConnectionStatus,
                entersState,
            },
        });
    });

    afterEach(() => {
        sinon.restore();
    });

    describe('runtime reconnect', () => {
        specify('recreates the voice connection without losing reading channels after rejoin fails', async () => {
            entersState.onCall(0).rejects(new Error('not signalling'));
            entersState.onCall(1).rejects(new Error('not connecting'));
            entersState.onCall(2).rejects(new Error('rejoin failed'));
            entersState.onCall(3).resolves();

            const vc = new DiscordVoiceChatModel('guild-1');
            await vc.join(voiceChannel());
            vc.addReadingChannel(textChannel());

            connections[0].emit('stateChange', {}, { status: VoiceConnectionStatus.Disconnected });
            await flushPromises();

            should.equal(vc.connection, null);
            vc.readingChannels.map((channel) => channel.id).should.deep.equal(['text-1']);
            connections[0].destroy.calledOnce.should.be.true;

            await clock.tickAsync(30000);
            await flushPromises();

            joinVoiceChannel.callCount.should.equal(2);
            vc.connection.should.equal(connections[1]);
            vc.readingChannels.map((channel) => channel.id).should.deep.equal(['text-1']);
            vc.reconnectAttempts.should.equal(0);
        });

        specify('does not let stale disconnect handling destroy a manually rejoined connection', async () => {
            entersState.rejects(new Error('old connection failed'));

            const vc = new DiscordVoiceChatModel('guild-1');
            await vc.join(voiceChannel('voice-1'));
            vc.addReadingChannel(textChannel('text-1'));

            connections[0].emit('stateChange', {}, { status: VoiceConnectionStatus.Disconnected });

            await vc.join(voiceChannel('voice-2'));
            vc.addReadingChannel(textChannel('text-2'));
            await flushPromises();
            await clock.tickAsync(30000);

            joinVoiceChannel.callCount.should.equal(2);
            vc.connection.should.equal(connections[1]);
            connections[1].destroy.called.should.be.false;
            vc.readingChannels.map((channel) => channel.id).should.deep.equal(['text-2']);
        });
    });

    describe('#addReadingChannel', () => {
        specify('deduplicates channels by id', async () => {
            const vc = new DiscordVoiceChatModel('guild-1');
            await vc.join(voiceChannel());

            vc.addReadingChannel(textChannel('text-1'));
            vc.addReadingChannel(textChannel('text-1'));

            vc.readingChannels.map((channel) => channel.id).should.deep.equal(['text-1']);
        });
    });
});

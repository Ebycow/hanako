const DiscordMessage = require('../../src/domain/entity/discord_message');
const CommandInput = require('../../src/domain/entity/command_input');
const Settings = require('../../src/domain/entity/settings');
const ServerStatus = require('../../src/domain/entity/server_status');
const VoiceStatus = require('../../src/domain/entity/voice_status');
const WordDictionary = require('../../src/domain/entity/word_dictionary');
const WordDictionaryLine = require('../../src/domain/entity/word_dictionary_line');
const SilenceDictionary = require('../../src/domain/entity/silence_dictionary');
const SilenceDictionaryLine = require('../../src/domain/entity/silence_dictionary_line');
const FoleyDictionary = require('../../src/domain/entity/foley_dictionary');
const FoleyDictionaryLine = require('../../src/domain/entity/foley_dictionary_line');
const FoleyAudio = require('../../src/domain/entity/audios/foley_audio');
const Hanako = require('../../src/domain/model/hanako');

function settingsBlueprint(overrides = {}) {
    return Object.assign(
        {
            id: 'mock-settings-id',
            serverId: 'mock-server-id',
            maxCount: 0,
            speaker: { userId: 'default', name: 'default' },
        },
        overrides
    );
}

function serverStatusBlueprint(overrides = {}) {
    return Object.assign(
        {
            id: 'mock-status-id',
            serverId: 'mock-server-id',
            serverName: 'mock-server-name',
            userId: 'mock-user-id',
            prefix: '>',
        },
        overrides
    );
}

function voiceStatusBlueprint(overrides = {}) {
    return Object.assign(
        {
            id: 'mock-status-id',
            serverId: 'mock-server-id',
            state: 'ready',
            voiceChannelId: 'mock-voice-channel-id',
            readingChannelsId: ['mock-reading-channel-id'],
        },
        overrides
    );
}

function dmessageBlueprint(overrides = {}) {
    return new DiscordMessage(
        Object.assign(
            {
                id: 'mock-entity-id',
                content: 'dummy',
                type: 'command',
                serverId: 'mock-server-id',
                channelId: 'mock-channel-id',
                userId: 'mock-user-id',
                voiceChannelId: null,
                mentionedUsers: new Map(),
            },
            overrides
        )
    );
}

function commandInputBlueprint(overrides = {}, dmessageOverrides = {}) {
    const origin = overrides.origin || dmessageBlueprint(dmessageOverrides);
    return new CommandInput(
        Object.assign(
            {
                id: origin.id,
                argc: 0,
                argv: [],
                origin,
            },
            overrides
        )
    );
}

function wordDictionaryLineBlueprint(overrides = {}) {
    return new WordDictionaryLine(
        Object.assign(
            {
                id: 'mock-wdl-id',
                dictId: 'mock-wd-id',
                from: '花子',
                to: 'はなこ',
            },
            overrides
        )
    );
}

function foleyDictionaryLineBlueprint(overrides = {}) {
    return new FoleyDictionaryLine(
        Object.assign(
            {
                id: 'mock-fdl-id',
                dictId: 'mock-fd-id',
                keyword: 'ドンッ',
                url: 'mock://se/don.wav',
            },
            overrides
        )
    );
}

function silenceDictionaryLineBlueprint(overrides = {}) {
    return new SilenceDictionaryLine(
        Object.assign(
            {
                id: 'mock-sdl-id',
                dictId: 'mock-sd-id',
                userId: 'mock-silent-user-id',
                createdAt: new Date('2024-01-01T00:00:00Z'),
            },
            overrides
        )
    );
}

function emptyWordDictionary(serverId = 'mock-server-id') {
    return new WordDictionary({ id: 'mock-wd-id', serverId, lines: [] });
}

function foleyAudioBlueprint(overrides = {}) {
    return new FoleyAudio(
        Object.assign(
            {
                serverId: 'mock-server-id',
                foleyId: 'mock-fdl-id',
            },
            overrides
        )
    );
}

function emptyFoleyDictionary(serverId = 'mock-server-id') {
    return new FoleyDictionary({ id: 'mock-fd-id', serverId, lines: [] });
}

function emptySilenceDictionary(serverId = 'mock-server-id') {
    return new SilenceDictionary({ id: 'mock-sd-id', serverId, lines: [] });
}

function basicHanako(overrides = {}) {
    const settings =
        overrides.settings instanceof Settings
            ? overrides.settings
            : new Settings(settingsBlueprint(overrides.settings));
    const serverStatus =
        overrides.serverStatus instanceof ServerStatus
            ? overrides.serverStatus
            : new ServerStatus(serverStatusBlueprint(overrides.serverStatus));
    let voiceStatus;
    if (overrides.voiceStatus === null) {
        voiceStatus = null;
    } else if (overrides.voiceStatus instanceof VoiceStatus) {
        voiceStatus = overrides.voiceStatus;
    } else {
        voiceStatus = new VoiceStatus(voiceStatusBlueprint(overrides.voiceStatus));
    }
    const wordDictionary = overrides.wordDictionary || emptyWordDictionary();
    const silenceDictionary = overrides.silenceDictionary || emptySilenceDictionary();
    const foleyDictionary = overrides.foleyDictionary || emptyFoleyDictionary();

    return new Hanako(settings, serverStatus, voiceStatus, wordDictionary, silenceDictionary, foleyDictionary);
}

module.exports = {
    settingsBlueprint,
    serverStatusBlueprint,
    voiceStatusBlueprint,
    dmessageBlueprint,
    commandInputBlueprint,
    wordDictionaryLineBlueprint,
    foleyDictionaryLineBlueprint,
    foleyAudioBlueprint,
    silenceDictionaryLineBlueprint,
    emptyWordDictionary,
    emptyFoleyDictionary,
    emptySilenceDictionary,
    basicHanako,
    // エンティティクラス再エクスポート
    DiscordMessage,
    CommandInput,
    Settings,
    ServerStatus,
    VoiceStatus,
    WordDictionary,
    WordDictionaryLine,
    SilenceDictionary,
    SilenceDictionaryLine,
    FoleyDictionary,
    FoleyDictionaryLine,
    FoleyAudio,
    Hanako,
};

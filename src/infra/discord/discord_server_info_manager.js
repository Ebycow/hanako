const path = require('path');
const logger = require('log4js').getLogger(path.basename(__filename));
const assert = require('assert').strict;
const discord = require('discord.js');
const errors = require('../../core/errors').promises;
const Injector = require('../../core/injector');
const IDiscordServerRepo = require('../../domain/repos/i_discord_server_repo');
const IWordDictionaryRepo = require('../../domain/repos/i_word_dictionary_repo');
const DiscordServer = require('../../domain/models/discord_server');
const ServerStatus = require('../../domain/entities/server_status');
const DiscordVoiceQueueManager = require('./discord_voice_queue_manager');

// unused
logger;

// TODO FIX モデルのコンストラクトはドメインサービス化すべき

class DiscordServerInfoManager {
    /**
     * @param {null} client DI
     * @param {null} wordRepo DI
     */
    constructor(client = null, wordRepo = null) {
        this.client = client || Injector.resolveSingleton(discord.Client);
        this.wordRepo = wordRepo || Injector.resolve(IWordDictionaryRepo);
        this.voiceManager = new DiscordVoiceQueueManager();
    }

    async load(id) {
        assert(typeof id === 'string');

        const G = this.client.guilds.resolve(id);
        if (!G) {
            errors.unexpected(`no-such-guild ${id}`);
        }

        const wordDictionary = await this.wordRepo.loadWordDictionary(G.id);

        const blueprint = {
            serverId: G.id,
            serverName: G.name,
            voiceStatus: null,
            voiceChannel: null,
            readingChannels: [],
            wordDictionary,
        };

        const vc = this.voiceManager.getVoiceChatModel(id);
        if (vc && vc.connection) {
            blueprint.readingChannels = vc.readingChannels.map(c => c.id);
            blueprint.voiceChannel = vc.connection.channel.id;
            blueprint.voiceStatus = vc.dispatcher === null ? 'ready' : 'speaking';
        }

        const server = new DiscordServer(G.id, new ServerStatus(blueprint));
        return Promise.resolve(server);
    }
}

IDiscordServerRepo.comprise(DiscordServerInfoManager);

module.exports = DiscordServerInfoManager;

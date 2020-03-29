const assert = require('assert').strict;
const Injector = require('../core/injector');
const ISettingsRepo = require('../domain/repo/i_settings_repo');
const IServerStatusRepo = require('../domain/repo/i_server_status_repo');
const IVoiceStatusRepo = require('../domain/repo/i_voice_status_repo');
const IWordDictionaryRepo = require('../domain/repo/i_word_dictionary_repo');
const ISilenceDictionaryRepo = require('../domain/repo/i_silence_dictionary_repo');
const Hanako = require('../domain/model/hanako');

/**
 * アプリケーションサービス
 * 読み上げ花子モデルの取得
 */
class HanakoLoader {
    /**
     * @param {null} settingsRepo DI
     * @param {null} serverStatusRepo DI
     * @param {null} voiceStatusRepo DI
     * @param {null} wordDictRepo DI
     * @param {null} silenceDictRepo DI
     */
    constructor(
        settingsRepo = null,
        serverStatusRepo = null,
        voiceStatusRepo = null,
        wordDictRepo = null,
        silenceDictRepo = null
    ) {
        this.settingsRepo = settingsRepo || Injector.resolve(ISettingsRepo);
        this.serverStatusRepo = serverStatusRepo || Injector.resolve(IServerStatusRepo);
        this.voiceStatusRepo = voiceStatusRepo || Injector.resolve(IVoiceStatusRepo);
        this.wordDictRepo = wordDictRepo || Injector.resolve(IWordDictionaryRepo);
        this.silenceDictRepo = silenceDictRepo || Injector.resolve(ISilenceDictionaryRepo);
    }

    /**
     * 指定されたDiscordサーバーにおける読み上げ花子モデルをロード
     *
     * @param {string} serverId DiscordサーバーのID
     * @returns {Promise<Hanako>} 読み上げ花子モデル
     */
    async load(serverId) {
        assert(typeof serverId === 'string');

        // 各種リポジトリから花子モデルの構成要素をロード
        const settings = await this.settingsRepo.loadSettings(serverId);
        const serverStatus = await this.serverStatusRepo.loadServerStatus(serverId);
        const voiceStatus = await this.voiceStatusRepo.loadVoiceStatus(serverId);
        const wordDictionary = await this.wordDictRepo.loadWordDictionary(serverId);
        const silenceDictionary = await this.silenceDictRepo.loadSilenceDictionary(serverId);

        // 花子モデルを生成して返却
        const hanako = new Hanako(settings, serverStatus, voiceStatus, wordDictionary, silenceDictionary);
        return Promise.resolve(hanako);
    }
}

module.exports = HanakoLoader;

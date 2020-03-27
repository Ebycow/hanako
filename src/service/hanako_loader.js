const assert = require('assert').strict;
const Injector = require('../core/injector');
const IServerStatusRepo = require('../domain/repo/i_server_status_repo');
const IVoiceStatusRepo = require('../domain/repo/i_voice_status_repo');
const IWordDictionaryRepo = require('../domain/repo/i_word_dictionary_repo');
const Hanako = require('../domain/model/hanako');

/**
 * アプリケーションサービス
 * 読み上げ花子モデルの取得
 */
class HanakoLoader {
    /**
     * @param {null} serverStatusRepo DI
     * @param {null} voiceStatusRepo DI
     * @param {null} wordDictRepo DI
     */
    constructor(serverStatusRepo = null, voiceStatusRepo = null, wordDictRepo = null) {
        this.serverStatusRepo = serverStatusRepo || Injector.resolve(IServerStatusRepo);
        this.voiceStatusRepo = voiceStatusRepo || Injector.resolve(IVoiceStatusRepo);
        this.wordDictRepo = wordDictRepo || Injector.resolve(IWordDictionaryRepo);
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
        const serverStatus = await this.serverStatusRepo.loadServerStatus(serverId);
        const voiceStatus = await this.voiceStatusRepo.loadVoiceStatus(serverId);
        const wordDictionary = await this.wordDictRepo.loadWordDictionary(serverId);

        // 花子モデルを生成して返却
        const hanako = new Hanako(serverStatus, voiceStatus, wordDictionary);
        return Promise.resolve(hanako);
    }
}

module.exports = HanakoLoader;

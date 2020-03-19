const Commando = require('./commando');

/**
 * ドメインモデル
 * ディスコードサーバー
 */
class DiscordServer {
    /**
     * @param {string} id サーバーID
     */
    constructor(id) {
        /**
         * サーバーID
         *
         * @type {string}
         */
        this.id = id;

        // TODO FIX
        this.prefix = process.env.PREFIX_KEY || '>';

        /**
         * コマンドー
         *
         * @type {Commando}
         */
        this.commando = new Commando();

        // TODO FIX
        this.isInitializing = false;
    }

    // TODO 無くせるはず
    async init() {
        this.isInitializing = true;
        // TODO FIX
        this.isInitializing = false;
    }

    /**
     * @param {string} channelId チャンネルID
     * @returns {boolean} 読み上げ対象のチャンネルか否か
     */
    isReadingChannel(channelId) {
        // TODO FIX
        return false;
    }

    /**
     * @param {string} text 任意のテキスト
     * @returns {boolean} テキストにコマンドプリフィクスが付いているか否か
     */
    hasCommandPrefix(text) {
        return text.startsWith(this.prefix);
    }
}

module.exports = DiscordServer;

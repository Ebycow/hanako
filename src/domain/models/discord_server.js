class DiscordServer {
    /**
     * @param {string} id
     */
    constructor(id) {
        /**
         * @type {string}
         */
        this.id = id;

        // TODO FIX
        this.prefix = process.env.PREFIX_KEY || '>';

        /**
         * @type {boolean}
         * @readonly
         */
        this.isInitializing = false;
    }

    /**
     * @returns {Promise<void>}
     */
    async init() {
        this.isInitializing = true;
        // TODO FIX
        this.isInitializing = false;
    }

    /**
     * @param {string} channelId
     * @returns {boolean} 読み上げ対象のチャンネルか否か
     */
    isReadingChannel(channelId) {
        // TODO FIX
        return false;
    }

    /**
     * @param {string} text
     * @returns {boolean} コマンドプリフィクスが付いているか否か
     */
    hasCommandPrefix(text) {
        return text.startsWith(this.prefix);
    }
}

module.exports = DiscordServer;

class DiscordServer {
    /**
     * @param {string} id
     */
    constructor(id) {
        /**
         * @type {string}
         * @private
         */
        this.id = id;

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
}

module.exports = DiscordServer;

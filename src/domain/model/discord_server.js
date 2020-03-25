const Commando = require('./commando');
const Reado = require('./reado');

/** @typedef {import('../entity/server_status')} ServerStatus */

/**
 * ドメインモデル
 * ディスコードサーバー
 */
class DiscordServer {
    /**
     * @param {string} id サーバーID
     * @param {ServerStatus} status サーバー状態
     */
    constructor(id, status) {
        /**
         * サーバーID
         *
         * @type {string}
         */
        this.id = id;

        /**
         * 読み取り専用のサーバー状態
         *
         * @type {ServerStatus}
         */
        this.status = status;

        // TODO FIX
        this.prefix = process.env.PREFIX_KEY || '>';

        /**
         * コマンドー
         *
         * @type {Commando}
         */
        this.commando = new Commando(status);

        /**
         * リードー
         *
         * @type {Reado}
         */
        this.reado = new Reado(status);
    }

    /**
     * @param {string} channelId チャンネルID
     * @returns {boolean} 読み上げ対象のチャンネルか否か
     */
    isReadingChannel(channelId) {
        return this.status.readingChannels.includes(channelId);
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

const path = require('path');
const logger = require('log4js').getLogger(path.basename(__filename));
const assert = require('assert').strict;
const VoiceResponse = require('../domain/entity/responses/voice_response');
const CommandParser = require('../domain/service/command_parser');
const CommandInvoker = require('../domain/service/command_invoker');
const MessageReader = require('../domain/service/message_reader');
const StreamFetcher = require('../domain/service/stream_fetcher');

/** @typedef {import('../domain/model/hanako')} Hanako */
/** @typedef {import('../domain/entity/discord_message')} DiscordMessage */
/** @typedef {import('../domain/entity/responses').ResponseT} ResponseT */

/**
 * アプリケーションサービス
 * メッセージを処理しレスポンス値を返すサービス
 */
class MessageService {
    /**
     * @param {null} commandParser DomainService
     * @param {null} commandInvoker DomainService
     * @param {null} messageReader DomainService
     * @param {null} streamFetcher DomainService
     */
    constructor(commandParser = null, commandInvoker = null, messageReader = null, streamFetcher = null) {
        this.commandParser = commandParser || new CommandParser();
        this.commandInvoker = commandInvoker || new CommandInvoker();
        this.messageReader = messageReader || new MessageReader();
        this.streamFetcher = streamFetcher || new StreamFetcher();
    }

    /**
     * メッセージエンティティを処理し、レスポンス値を返す。
     *
     * @param {Hanako} hanako 読み上げ花子モデル
     * @param {DiscordMessage} dmessage 処理するメッセージエンティティ
     * @returns {Promise<ResponseT>} レスポンスエンティティ
     */
    async serve(hanako, dmessage) {
        assert(typeof hanako === 'object');
        assert(typeof dmessage === 'object');
        logger.trace(`メッセージを受理 ${dmessage}`);

        if (dmessage.type === 'command') {
            // コマンドタイプのメッセージを処理
            const input = await this.commandParser.parse(hanako, dmessage);
            const response = await this.commandInvoker.invoke(hanako, input);
            return Promise.resolve(response);
        } else if (dmessage.type === 'read') {
            // 読み上げタイプのメッセージを処理
            const audios = await this.messageReader.read(hanako, dmessage);
            const stream = await this.streamFetcher.fetch(audios);
            const response = new VoiceResponse({ id: dmessage.id, stream, serverId: dmessage.serverId });
            return Promise.resolve(response);
        } else {
            throw new Error('unreachable');
        }
    }
}

module.exports = MessageService;

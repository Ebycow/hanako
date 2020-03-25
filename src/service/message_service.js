const path = require('path');
const logger = require('log4js').getLogger(path.basename(__filename));
const assert = require('assert').strict;
const errors = require('../core/errors').promises;
const Injector = require('../core/injector');
const IVoiceroidStreamRepo = require('../domain/repo/i_voiceroid_stream_repo');
const CommandInput = require('../domain/entity/command_input');
const VoiceResponse = require('../domain/entity/responses/voice_response');
const EbyStream = require('../core/ebystream');

/** @typedef {import('../domain/model/discord_server')} DiscordServer */
/** @typedef {import('../domain/entity/discord_message')} DiscordMessage */
/** @typedef {import('../domain/entity/responses').ResponseT} ResponseT */

/**
 * アプリケーションサービス
 * メッセージを処理しレスポンス値を返すサービス
 */
class MessageService {
    /**
     * @param {null} vrStreamRepo DI
     */
    constructor(vrStreamRepo = null) {
        this.vrStreamRepo = vrStreamRepo || Injector.resolve(IVoiceroidStreamRepo);
    }

    /**
     * メッセージエンティティを処理し、レスポンス値を返す。
     *
     * @param {DiscordMessage} dmessage 処理するメッセージエンティティ
     * @param {DiscordServer} server 送信元サーバー
     * @returns {Promise<ResponseT>} レスポンスエンティティ
     */
    async serve(dmessage, server) {
        assert(typeof dmessage === 'object');
        assert(typeof server === 'object');
        logger.trace(`メッセージを受理 ${dmessage}`);

        if (dmessage.type === 'command') {
            // コマンドタイプのメッセージ処理をメソッドに委譲
            return processCommandMessageF.call(this, dmessage, server);
        } else if (dmessage.type === 'read') {
            // 読み上げタイプのメッセージ処理をメソッドに委譲
            return processReadMessageF.call(this, dmessage, server);
        } else {
            throw new Error('unreachable');
        }
    }
}

/**
 * (private) メッセージをコマンドとして処理し、レスポンス値を返す。
 *
 * @this {MessageService}
 * @param {DiscordMessage} dmessage メッセージエンティティ
 * @param {DiscordServer} server メッセージが紐ついているサーバー
 */
async function processCommandMessageF(dmessage, server) {
    assert(dmessage.type === 'command');

    let command, input;
    try {
        input = CommandInput.tryParse(dmessage, server.prefix);
    } catch (e) {
        if (e instanceof TypeError) {
            logger.info(`パースできないコマンドを受信した ${dmessage}`);
            return errors.abort();
        } else {
            return Promise.reject(e);
        }
    }

    [command, input] = server.commando.resolve(input);
    if (!command) {
        logger.info(`コマンドが見当たらない ${input}`);
        return errors.abort();
    }

    const response = command.process(input);
    return Promise.resolve(response);
}

/**
 * (private) メッセージを読み上げ処理し、音声ストリームに変換してレスポンス値を返す。
 *
 * @this {MessageService}
 * @param {DiscordMessage} dmessage メッセージエンティティ
 * @param {DiscordServer} server メッセージが紐ついているサーバー
 */
async function processReadMessageF(dmessage, server) {
    assert(dmessage.type === 'read');

    const audios = server.reado.compose(dmessage.content);
    const promises = audios.map(audio => this.vrStreamRepo.getStream(audio));
    const streams = await Promise.all(promises);
    if (streams.length === 0) {
        logger.info(`変換した結果、音声ストリームが空なので処理を中止する ${dmessage}`);
        return errors.abort();
    }
    const stream = new EbyStream(streams);
    const response = new VoiceResponse({ id: dmessage.id, stream, serverId: dmessage.serverId });

    return Promise.resolve(response);
}

module.exports = MessageService;

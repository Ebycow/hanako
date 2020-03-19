const path = require('path');
const logger = require('log4js').getLogger(path.basename(__filename));
const assert = require('assert').strict;
const Injector = require('../core/injector');
const IDiscordServerRepo = require('../domain/repos/i_discord_server_repo');
const CommandInput = require('../domain/entities/command_input');

/**
 * アプリケーションサービス
 * メッセージ処理
 */
class MessageService {
    /**
     * @param {null} serverRepo
     */
    constructor(serverRepo = null) {
        this.serverRepo = serverRepo || Injector.resolve(IDiscordServerRepo);
    }

    /**
     * メッセージエンティティを適切に処理し、レスポンス値を返す。
     *
     * @param {import('../domain/entities/discord_message')} dmessage 処理するメッセージ
     * @returns {Promise<Response>}
     */
    async serve(dmessage) {
        assert(typeof dmessage === 'object');

        const server = await this.serverRepo.loadOrCreate(dmessage.serverId);

        if (dmessage.type === 'command') {
            let command, input;
            try {
                input = CommandInput.tryParse(dmessage, server.prefix);
            } catch (e) {
                if (e instanceof TypeError) {
                    logger.warn(`パースできないコマンドを受信した ${dmessage}`);
                    // TODO FIX errortype
                    return Promise.reject(0);
                } else {
                    return Promise.reject(e);
                }
            }
            [command, input] = server.commando.resolve(input);
            if (!command) {
                logger.info(`コマンドが見当たらない ${input}`);
                // TODO FIX errortype
                return Promise.reject(0);
            }
            const response = command.process(input);

            return Promise.resolve(response);
        } else if (dmessage.type === 'read') {
            // TODO 読み上げ処理
            return Promise.reject(0);
        } else {
            throw new Error('unreachable');
        }
    }
}

module.exports = MessageService;

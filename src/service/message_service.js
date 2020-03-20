const path = require('path');
const logger = require('log4js').getLogger(path.basename(__filename));
const assert = require('assert').strict;
const errors = require('../core/errors').promises;
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

        const server = await this.serverRepo.load(dmessage.serverId);

        if (dmessage.type === 'command') {
            let command, input;
            try {
                input = CommandInput.tryParse(dmessage, server.prefix);
            } catch (e) {
                if (e instanceof TypeError) {
                    logger.warn(`パースできないコマンドを受信した ${dmessage}`);
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
        } else if (dmessage.type === 'read') {
            // TODO 読み上げ処理
            return errors.abort('TODO');
        } else {
            throw new Error('unreachable');
        }
    }
}

module.exports = MessageService;

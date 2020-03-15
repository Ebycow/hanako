const path = require('path');
const logger = require('log4js').getLogger(path.basename(__filename));
const EbyAsync = require('../utils/ebyasync');
const { DiscordServer } = require('../models/discordserver');
const { MessageContext } = require('../contexts/messagecontext');
const { EmojiReplacer, DiscordTagReplacer, UrlReplacer } = require('../utils/replacer');
const { AudioAdapterManager } = require('../adapters/audioadapter');
const { FileAdapterErrors } = require('../adapters/fileadapter');
const { ContentType } = require('../commands/commandresult');

/** @typedef {import('discord.js').Client} Client */
/** @typedef {import('discord.js').Message} Message */

class MessageCtrl {
    /**
     * @param {Client} client
     */
    constructor(client, servers) {
        this.client = client; // TODO 持ってないとだめ？
        this.servers = servers; // TODO FIX

        this.client.on('message', message => this.onMessage(message)); // TODO いけてない
    }

    /**
     *
     * @param {Message} message
     */
    async onMessage(message) {
        const servers = this.servers; // TODO FIX
        if (message.author.id === this.client.user.id) {
            // 花子自身のメッセージ
            if (typeof message.nonce === 'number' && message.nonce >>> 16 === 0xebeb) {
                // 命令が埋め込まれていた場合
                logger.info('インターナル命令を受信', message.nonce.toString(16));
                const opcode = (message.nonce & 0xffff) >>> 0;
                let tmp;
                switch (opcode) {
                    case 1:
                        // 復帰命令
                        tmp = message.content.split(' ');
                        tmp[1] = 'plz';
                        message.content = tmp.slice(0, 2).join(' ');
                        break;
                    default:
                        logger.error('未知のインターナル命令', message);
                        return;
                }
            } else {
                // 自分のメッセージは無視
                return;
            }
        } else if (message.author.bot || message.channel.type !== 'text') {
            // BotとDMは無視
            logger.trace(`${message.author.username}の${message.channel.type}メッセージを無視`);
            return;
        }

        const key = message.guild.id;

        /** @type {DiscordServer} */
        let server;

        if (servers.has(key)) {
            server = servers.get(key);
            if (server.isInitializing) {
                const MAX = 100;
                let count = 0;
                while (count < MAX) {
                    count += 1;
                    await EbyAsync.sleep(100);
                    server = servers.get(key);
                    if (!server) {
                        logger.warn('初期化待ち中にサーバーが消えたので無視したメッセージ', message);
                        return;
                    }
                    if (!server.isInitializing) {
                        logger.info(`サーバーが初期化中だったので${count}回待った。`);
                        break;
                    }
                }
                if (server.isInitializing) {
                    logger.error(`${MAX}回待ったのに初期化が終わらなかった。`, server);
                    return;
                }
            }
            if (!server.isCommandMessage(message) && !server.isMessageToReadOut(message)) {
                // コマンドじゃない＆読み上げないなら，性能要件のためここで切り上げる
                // （ここを通過してもawaitが絡むので後々の分岐で蹴られる場合がある）
                logger.trace(`pass: ${message.author.username} ${message.content}`);
                return;
            }
        } else {
            server = new DiscordServer(message.guild);
            servers.set(key, server);
            try {
                await server.init();
            } catch (err) {
                servers.set(key, null);
                logger.error('初期化失敗', err);
                return;
            }
        }

        const voiceJoin = async () => {
            await server.vc.join(message.member.voice.channel);
            server.mainChannel = message.channel;
            return `${message.channel}`;
        };

        const voiceLeave = () => {
            server.vc.leave();
            server.mainChannel = null;
        };

        const resolveUserName = userId => {
            const member = message.mentions.members.find(m => userId === m.id);
            if (member) {
                return member.displayName;
            } else {
                // Discordタグ直打ちの場合
                return '誰ですか？';
            }
        };

        const context = new MessageContext({
            isMainChannel: !!server.mainChannel && message.channel.id === server.mainChannel.id,
            isAuthorInVC: !!message.member.voice.channel,
            isJoined: () => server.vc.isJoined,
            isSpeaking: () => server.vc.isStreaming || server.vc.queueLength > 0,
            queueLength: () => server.vc.queueLength,
            queuePurge: () => server.vc.clearQueue(),
            voiceJoin,
            voiceLeave,
            voiceCancel: () => server.vc.killStream(),
            authorId: message.author.id,
            mentionedUsers: message.mentions.members.reduce((map, m) => map.set(m.displayName, m.id), new Map()),
            resolveUserName,
            resolveRoleName: x => message.mentions.roles.find(r => x === r.id).name,
            resolveChannelName: x => message.mentions.channels.find(c => x === c.id).name,
        });

        // コンテキストが確定した時点で絵文字とタグの一括置換を行う
        message.content = EmojiReplacer.replace(message.content);
        message.content = DiscordTagReplacer.replace(context, message.content);

        logger.trace('元々のmessage.content:', message.content);

        if (server.isCommandMessage(message)) {
            try {
                const result = await server.handleMessage(context, message);
                if (result.replyText) {
                    const sentMessage = await message.channel.send(result.replyText);
                    if (result.contentType === ContentType.PAGER) {
                        await sentMessage.react('👈');
                        await sentMessage.react('👉');
                    }
                }
            } catch (err) {
                logger.error('コマンド処理でエラー', err);
                return;
            }
        } else if (server.isMessageToReadOut(message)) {
            let text = message.content;

            // URL置換
            text = UrlReplacer.replace(text);

            // リプレーサーによる置換
            text = server.handleReplace(context, text);

            logger.trace('リクエスト直前のtext:', text);

            // リクエストコンバーターによる変換
            const requests = server.createRequests(context, text);

            logger.trace(requests);

            // リクエストの実行
            let stream;
            try {
                stream = await AudioAdapterManager.request(...requests);
            } catch (err) {
                if (err === FileAdapterErrors.NOT_FOUND) {
                    logger.warn('リクエストしたファイルが見つからなかった。', requests);
                    return;
                } else {
                    logger.error('オーディオリクエストでエラー', err);
                    return;
                }
            }

            // awaitが絡んだのでここではnullの可能性があるよ
            if (!server.vc.isJoined) {
                logger.info('オーディオリクエスト中にVC切断されてました。', message.guild.name);
                stream.destroy();
                return;
            }

            server.vc.push(stream);
        }
    }
}

module.exports = MessageCtrl;

require('dotenv').config();
const Discord = require('discord.js');
const client = new Discord.Client();
const path = require('path');
const log4js = require('log4js');
log4js.configure('./log4js-config.json');
const logger = log4js.getLogger(path.basename(__filename));

const { GracefulShutdown } = require('./utils/shutdown');
const { EbyAsync } = require('./utils/ebyasync');
const { DiscordTagReplacer, UrlReplacer, EmojiReplacer } = require('./utils/replacer');
const { DiscordServer } = require('./models/discordserver');
const { MessageContext } = require('./contexts/messagecontext');
const { ActionContext } = require('./contexts/actioncontext');
const { AudioAdapterManager } = require('./adapters/audioadapter');
const { FileAdapterManager, FileAdapterErrors } = require('./adapters/fileadapter');
const { RecoveryAdapterManager } = require('./adapters/recoveryadapter');
const { ContentType } = require('./commands/commandresult');

AudioAdapterManager.init({
    ebyroid: {
        baseUrl: 'http://localhost:4090/api/v1/audiostream',
    },
});

FileAdapterManager.init({
    maxDownloadByteSize: 1000 * 1000 * 2, //2MB
});

RecoveryAdapterManager.init();

/**
 * @type {Map<string, DiscordServer>}
 */
let servers = new Map();

client.on('ready', async () => {
    logger.info(`Logged in as ${client.user.tag}!`);

    try {
        await RecoveryAdapterManager.recover(info => {
            const guild = client.guilds.resolve(info.serverId);
            if (!guild) {
                logger.warn('復帰情報からギルド情報が取得できない。', info);
                return Promise.resolve();
            }
            /** @type {Discord.VoiceChannel} */
            const voiceChannel = guild.channels.resolve(info.voiceChannelId);
            if (!voiceChannel) {
                logger.warn('復帰先の音声チャンネルが見つからない。', info);
                return Promise.resolve();
            }
            /** @type {Discord.TextChannel} */
            const textChannel = guild.channels.resolve(info.textChannelId);
            if (!textChannel) {
                logger.warn('復帰後読み上げ対象のテキストチャネルが見つからない。', info);
                return Promise.resolve();
            }
            if (voiceChannel.members.size === 0) {
                logger.info('復帰しようとしたが、VCに誰もいなかった。', info);
                return Promise.resolve();
            }

            return voiceChannel
                .join()
                .then(() =>
                    textChannel.send(`${client.user} は再接続を試みています。ふごにゃ～んごろごろんみゅ……`, {
                        nonce: 0xebeb0001,
                    })
                )
                .catch(e => logger.warn('復帰中のDiscordエラー', e))
                .then(() => Promise.resolve());
        });
    } catch (err) {
        logger.error('VC復帰処理中のエラー', err);
    }
});

client.on('message', async message => {
    if (message.author.id === client.user.id) {
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
        mentionedUsers: message.mentions.users.reduce((map, user) => map.set(user.username, user.id), new Map()),
        resolveUserName: x => message.mentions.users.find(u => x === u.id).username,
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
});

client.on('voiceStateUpdate', (oldState, newState) => {
    const server = servers.get(newState.guild.id);
    if (server) {
        if (server.vc.connection !== null) {
            if (server.vc.connection.channel.members.size === 1) {
                logger.info('誰もいないので退出した。', newState.guild.name, server.vc.connection.channel.name);
                server.vc.leave();
                server.mainChannel = null;
            }
        }
    }
});

client.on('messageReactionAdd', async (reaction, user) => {
    if (reaction.message.author.id !== client.user.id) {
        // 花子以外のメッセージについたリアクションは無視
        return;
    }

    if (user.id === client.user.id) {
        // 自分が付けたリアクションは無視
        return;
    }

    const server = servers.get(reaction.message.guild.id);
    if (!server) {
        // 未初期化のサーバーなので無視
        return;
    }

    const emoji = Buffer.from(reaction.emoji.name, 'utf-8');
    logger.trace('リアクションがついたにゃ', emoji, reaction.message.content);

    const context = new ActionContext({});

    try {
        const result = await server.handleReaction(context, reaction, emoji);
        if (result.text) {
            await reaction.message.edit(result.text);
        }
    } catch (error) {
        logger.error(error);
    }
});

GracefulShutdown.onExit(async () => {
    const regs = [];
    for (const server of servers.values()) {
        if (server.vc.isJoined) {
            regs.push({
                serverId: server.id,
                textChannelId: server.mainChannel.id,
                voiceChannelId: server.vc.connection.channel.id,
            });
            server.vc.leave();
        }
    }
    await RecoveryAdapterManager.book(...regs);
});

client.login(process.env.TOKEN);

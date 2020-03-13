require('dotenv').config();
const Discord = require('discord.js');
const client = new Discord.Client();
const path = require('path');
const log4js = require('log4js');
log4js.configure('./log4js-config.json');
const logger = log4js.getLogger(path.basename(__filename));

const { DiscordTagReplacer, UrlReplacer, EmojiReplacer } = require('./utils/replacer');
const { DiscordServer } = require('./models/discordserver');
const { MessageContext } = require('./contexts/messagecontext');
const { ActionContext } = require('./contexts/actioncontext');
const { AudioAdapterManager } = require('./adapters/audioadapter');
const { FileAdapterManager, FileAdapterErrors } = require('./adapters/fileadapter');
const { ContentType } = require('./commands/commandresult');

client.on('ready', () => {
    logger.info(`Logged in as ${client.user.tag}!`);
});

AudioAdapterManager.init({
    ebyroid: {
        baseUrl: 'http://localhost:4090/api/v1/audiostream',
    },
});

FileAdapterManager.init({
    maxDownloadByteSize: 1000 * 1000 * 2, //2MB
});

/**
 * @type {Map<string, DiscordServer>}
 */
let servers = new Map();

client.on('message', async message => {
    if (message.author.id === client.user.id) {
        // 自分のメッセージは無視
        return;
    }
    if (!message.guild) {
        // DMとかは無視
        logger.trace('処理されなかったメッセージ', message);
        return;
    }

    const key = message.guild.id;

    /** @type {DiscordServer} */
    let server;

    if (servers.has(key)) {
        server = servers.get(key);
        if (server.isInitializing) {
            logger.trace('初期化中なので無視したメッセージ', message);
            return;
        }
        if (!server.isCommandMessage(message) && !server.isMessageToReadOut(message)) {
            // コマンドじゃない＆読み上げないなら，性能要件のためここで切り上げる
            // （ここを通過してもawaitが絡むので後々の分岐で蹴られる場合がある）
            logger.trace(`pass: ${message.content}`);
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
        await server.vc.join(message.member.voiceChannel);
        server.mainChannel = message.channel;
        return `${message.channel}`;
    };

    const voiceLeave = () => {
        server.vc.leave();
        server.mainChannel = null;
    };

    const context = new MessageContext({
        isMainChannel: !!server.mainChannel && message.channel.id === server.mainChannel.id,
        isAuthorInVC: !!message.member.voiceChannel,
        isJoined: () => server.vc.isJoined,
        isSpeaking: () => server.vc.isStreaming || server.vc.queueLength > 0,
        queueLength: () => server.vc.queueLength,
        queuePurge: () => server.vc.clearQueue(),
        voiceJoin,
        voiceLeave,
        voiceCancel: x => server.vc.killStream(x),
        authorId: message.author.id,
        mentionedUsers: message.mentions.users.reduce((map, user) => map.set(user.username, user.id), new Map()),
        resolveUserName: x => message.mentions.users.find('id', x).username,
        resolveRoleName: x => message.guild.roles.find('id', x).name,
        resolveChannelName: x => message.guild.channels.find('id', x).name,
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

client.on('voiceStateUpdate', (oldMember, newMember) => {
    const server = servers.get(newMember.guild.id);
    if (server !== undefined) {
        if (server.vc.connection !== null) {
            if (server.vc.connection.channel.members.map(member => member.id).length === 1) {
                logger.info('誰もいないので退出した。', newMember.guild.name, server.vc.connection.channel.name);
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

client.login(process.env.TOKEN);

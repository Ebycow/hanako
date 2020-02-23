require('dotenv').config();
const Discord = require('discord.js');
const client = new Discord.Client();
const { UrlReplacer, EmojiReplacer } = require('./utils/replacer');
const { DiscordServer } = require('./models/discordserver');
const { EbyroidRequest, SoundRequest } = require('./models/audiorequest');
const { MessageContext } = require('./contexts/messagecontext');
const { AudioAdapterManager } = require('./adapters/audioadapter');
const { FileAdapterManager } = require('./adapters/fileadapter');

client.on('ready', () => {
  console.log(`Logged in as ${client.user.tag}!`);
});

AudioAdapterManager.init({
    ebyroid: {
        baseUrl: 'http://localhost:4090/'
    }
});

FileAdapterManager.init();

/**
 * @type {Map<string, DiscordServer>}
 */
let servers = new Map();

client.on('message', async (message) => {
    if (message.author.id === client.user.id) {
        // 自分のメッセージは無視
        return;
    }
    if (!message.guild) {
        // DMとかは無視
        console.info('処理されなかったメッセージ', message);
        return;
    }
    
    const key = message.guild.id;

    /** @type {DiscordServer} */
    let server;
    
    if (servers.has(key)) {
        server = servers.get(key);
        if (server.isInitializing) {
            console.info('初期化中なので無視したメッセージ', message);
            return;
        }
        if (!server.isCommandMessage(message) && !server.isMessageToReadOut(message)) {
            // コマンドじゃない＆読み上げないなら，性能要件のためここで切り上げる
            // （ここを通過してもawaitが絡むので後々の分岐で蹴られる場合がある）
            console.info(`pass: ${message.content}`);
            return;
        } 
    } else {
        server = new DiscordServer(message.guild);
        servers.set(key, server);
        try {
            await server.init();
        } catch (err) {
            servers.set(key, null);
            console.error('初期化失敗', err);
            return;
        }
    }

    const voiceJoin = async () => {
        await server.vc.join(message.member.voiceChannel);
        server.mainChannel = message.channel;
        return `${message.channel}`;
    }

    const voiceLeave = () => {
        server.vc.leave();
        server.mainChannel = null;
    }

    const context = new MessageContext({
        isMainChannel: !!(server.mainChannel) && (message.channel.id === server.mainChannel.id),
        isAuthorInVC: !!(message.member.voiceChannel),
        isJoined: () => server.vc.isJoined,
        isSpeaking: () => (server.vc.isStreaming || (server.vc.queueLength > 0)),
        queueLength: () => server.vc.queueLength,
        queuePurge: () => server.vc.clearQueue(),
        voiceJoin, voiceLeave,
        voiceCancel: (x) => server.vc.killStream(x),
        resolveUserName: (x) => message.mentions.users.find('id', x).username,
        resolveRoleName: (x) => message.guild.roles.find('id', x).name,
        resolveChannelName: (x) => message.guild.channels.find('id', x).name,
    });

    console.info(message.content);

    if (server.isCommandMessage(message)) {
        try {
            const result = await server.handleMessage(context, message);
            if (result.replyText) {
                await message.reply(result.replyText);
            }
        } catch (err) {
            console.error(err);
            return; // TODO: 例外処理これでいい？
        }

    } else if (server.isMessageToReadOut(message)) {

        let text = message.content;

        // うにこーど絵文字置換
        text = EmojiReplacer.replace(text);

        // URL置換
        text = UrlReplacer.replace(text);

        // リプレーサーによる置換
        text = server.handleReplace(context, text);

        console.info(text);

        const stream = await AudioAdapterManager.request(
            new EbyroidRequest(text), new EbyroidRequest('ところで、さとみが言うには'),
            new SoundRequest('test-segment', 'uiissu'), new EbyroidRequest('ってことらしい'));

        // awaitが絡んだのでここではnullの可能性があるよ
        if (!server.vc.isJoined) {
            console.info('オーディオリクエスト中にVC切断されてました。', message.guild.name);
            stream.destroy();
            return;
        }
        console.log(stream);
        server.vc.push(stream);
    }
});

client.login(process.env.TOKEN);


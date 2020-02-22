require('dotenv').config();
const fs = require('fs');
const { Readable } = require('stream');
const Discord = require('discord.js');
const axios = require('axios').default;
const client = new Discord.Client();
const exitHook = require('exit-hook');
const SampleRate = require('node-libsamplerate');
const { Interleaver } = require('./transforms/interleaver');
const { StereoByteAdjuster } = require('./transforms/byteadjuster');
const { WaveFileHeaderTrimmer } = require('./transforms/waveheader');
const { UrlReplacer, EmojiReplacer } = require('./utils/replacer');

const { DiscordServer } = require('./models/discordserver');
const { MessageContext } = require('./contexts/messagecontext');

client.on('ready', () => {
  console.log(`Logged in as ${client.user.tag}!`);
});

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

        let response;
        try {
            response = await axios.get(`http://localhost:4090/`, {
                responseType: 'stream',
                params : { text }
            });
        } catch (err) {
            console.error(err);
            return // TODO: 例外処理どうする？
        }

        const sampleRate = parseInt(response.headers['ebyroid-pcm-sample-rate'], 10);
        const bitDepth = parseInt(response.headers['ebyroid-pcm-bit-depth'], 10);
        const numChannels = parseInt(response.headers['ebyroid-pcm-number-of-channels'], 10);

        // awaitが絡んだのでここではnullの可能性があるよ
        if (!server.vc.isJoined) {
            console.info('HTTPリクエスト中にVC切断されてました。', message.guild.name);
            response.data.destroy();
            return;
        }

        let stream = response.data;
        if (numChannels == 1) {
            // 元データがモノラルのとき
            stream = stream.pipe(new Interleaver());
        } else {
            // 元データがステレオのとき
            stream = stream.pipe(new StereoByteAdjuster());
        }

        // # SE流す時はこう
        //
        // const sampleRate = 44100;
        // const bitDepth = 16;
        // stream = fs.createReadStream('syamu.wav').pipe(new WaveFileHeaderTrimmer).pipe(new StereoByteAdjuster);

        const resample = new SampleRate({
            type: SampleRate.SRC_SINC_MEDIUM_QUALITY,
            channels: 2,
            fromRate: sampleRate,
            fromDepth: bitDepth,
            toRate: 48000,
            toDepth: 16
        });
        stream = stream.pipe(resample);

        server.vc.push(stream);
    }
});

client.login(process.env.TOKEN);


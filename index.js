require('dotenv').config();
const fs = require('fs');
const { Readable } = require('stream');
const Discord = require('discord.js');
const axios = require('axios').default;
const client = new Discord.Client();
const exitHook = require('exit-hook');
const SampleRate = require('node-libsamplerate');
const Interleaver = require('./transforms/interleaver').Interleaver;
const StereoByteAdjuster = require('./transforms/byteadjuster').StereoByteAdjuster;
const WaveFileHeaderTrimmer = require('./transforms/waveheader').WaveFileHeaderTrimmer;
const DiscordTagReplacer = require('./utils/replacer').DiscordTagReplacer;
const UrlReplacer = require('./utils/replacer').UrlReplacer;
const EmojiReplacer = require('./utils/replacer').EmojiReplacer;

const { DiscordServer } = require('./models/discordserver');
const { MessageContext } = require('./contexts/messagecontext');

client.on('ready', () => {
  console.log(`Logged in as ${client.user.tag}!`);
});

/**
 * @type {Map<string, DiscordServer>}
 */
let servers = new Map();

/**
 * @type {Map<string, Discord.VoiceConnection?>}
 */
let connections = new Map();

/**
 * @type {Map<string, Readable[]>}
 */
let queues = new Map();

/**
 * @type {Map<string, Discord.StreamDispatcher>}
 */
let dispatchers = new Map();

/**
 * @type {Map<string, Discord.TextChannel>}
 */
let channels = new Map();

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
    } else {
        server = new DiscordServer(message.guild);
        servers.set(key, server);
        connections.set(key, null);
        queues.set(key, []);
        dispatchers.set(key, null);
        channels.set(key, null);
    }

    const queuePurge = () => {
        const cue = queues.get(key);
        cue.forEach(stream => stream.destroy());
        queues.set(key, []);
    }

    const voiceJoin = async () => {
        const vc = await message.member.voiceChannel.join();
        const unsub = exitHook(() => vc.disconnect());
        vc.once('disconnect', _ => unsub());
        connections.set(key, vc);
        channels.set(key, message.channel);
        return `${message.channel}`;
    }

    const voiceLeave = () => {
        queuePurge();
        const vc = connections.get(key);
        if (vc) {
            vc.disconnect();
        }
        channels.set(key, null);
    }

    const voiceCancel = (reason) => {
        return new Promise((resolve) => {
            const disp = dispatchers.get(key);
            if (disp) {
                disp.end(reason);
                setImmediate(() => resolve());
            } else {
                resolve();
            }
        });
    }

    const context = new MessageContext({
        isMainChannel: !!(channels.get(key)) && (message.channel === channels.get(key)),
        isAuthorInVC: !!(message.member.voiceChannel),
        isJoined: () => !!(connections.get(key)),
        isSpeaking: () => (!!(dispatchers.get(key)) || (queues.get(key).length > 0)),
        queueLength: () => queues.get(key).length,
        queuePurge,
        voiceJoin,
        voiceLeave,
        voiceCancel
    });

    console.info(message.content);

    if (server.isCommandMessage(message)) {
        try {
            const result = await server.handleMessage(context, message);
            if (result.replyText) {
                _ = await message.reply(result.replyText);
            }
        } catch (err) {
            console.error(err);
            return; // TODO: 例外処理これでいい？
        }
    } else if(!context.isMainChannel) {
        return; // TODO: Multi Channels

    } else if (connections.get(key) !== null) {

        let text = message.content;

        // うにこーど絵文字置換
        text = EmojiReplacer.replace(text);

        // URL置換
        text = UrlReplacer.replace(text);

        // Discordタグ置換
        text = DiscordTagReplacer.replace(text, message.mentions.users, message.guild.channels);

        // コマンド設定による置換
        text = server.handleReplace(text);

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
        const voiceConnection = connections.get(key);
        if (!voiceConnection) {
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

        const cue = queues.get(key);
        cue.push(stream);

        const disp = dispatchers.get(key);
        if (!disp) {
            const newDisp = voiceConnection.playConvertedStream(cue.shift(0), { bitrate: 'auto' });
            dispatchers.set(key, newDisp)
            newDisp.on('end', _ => playNextCue(key));
        }
    }
});

function playNextCue(key) {
    const cue = queues.get(key);
    const stream = cue.shift(0);
    console.info('cue', cue.length);
    if (stream) {
        setImmediate(() => {
            const voiceConnection = connections.get(key);
            if (voiceConnection) {
                newDisp = voiceConnection.playConvertedStream(stream, { bitrate: 'auto' });
                dispatchers.set(key, newDisp);
                newDisp.on('end', _ => playNextCue(key));
            }
        });
    } else {
        dispatchers.set(key, null);
    }
}

client.login(process.env.TOKEN);


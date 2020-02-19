require('dotenv').config();
const fs = require('fs');
const Discord = require('discord.js');
const axios = require('axios').default;
const client = new Discord.Client();
const exitHook = require('exit-hook');
const SampleRate = require('node-libsamplerate');
const emoji = require('node-emoji')
const Interleaver = require('./transforms/interleaver').Interleaver;
const StereoByteAdjuster = require('./transforms/byteadjuster').StereoByteAdjuster;
const WaveFileHeaderTrimmer = require('./transforms/waveheader').WaveFileHeaderTrimmer;
const DiscordTagReplacer = require('./utils/tagreplacer').DiscordTagReplacer;

const TeachCommand = require('./commands/teach').TeachCommand;
const teachCommand = new TeachCommand();
const LimitCommand = require('./commands/limit').LimitCommand;
const limitCommand = new LimitCommand();

let voiceChannelConnection = undefined;

let streamCue = [];
let playingDispatcher = undefined;

client.on('ready', () => {
  console.log(`Logged in as ${client.user.tag}!`);
});

client.on('message', async (msg) =>
{
    if (msg.isMemberMentioned(client.user)　|| msg.content.startsWith("?") ) {

        // VC参加
        if(msg.content.match('plz')) {
            if(msg.member.voiceChannel) {
                // リプライしてきたユーザのボイスチャンネルに参加

                voiceChannelConnection = await msg.member.voiceChannel.join();

                msg.reply(`${msg.channel}に参加したよ、よろしくね`);

                const unsubscribe = exitHook(() => {
                   voiceChannelConnection.disconnect();
                });
                voiceChannelConnection.on('disconnect', (_) => {
                    unsubscribe();
                });

            } else if(voiceChannelConnection) {
                msg.reply('すでに通話チャンネルに参加済みですよ、「さようなら」とリプライすると切断します');

            } else {
                msg.reply('テキストチャンネルに参加してから呼んでね');

            }

        }

        // VC切断
        if(msg.content.match('bye')) {
            if(voiceChannelConnection) {
                streamCue = [];
                voiceChannelConnection.disconnect();
        
            } else {
                msg.reply("どこのチャンネルにも参加していないか、エラーが発生しています :sob:");
            }

        }

        // 成敗
        if(msg.content.match('seibai')) {
            if(playingDispatcher){
                for (const stream of streamCue) {
                    stream.destroy();
                }
                streamCue = [];
                playingDispatcher.end("seibai")
                msg.reply("戯け者 余の顔を見忘れたか :knife:");

            } else {
                msg.reply("安心せい、みねうちにゃ… :knife:");

            }

        }
        
        // 文字数制限
        if(msg.content.match('limit')) {
            limitCommand.setLimit(msg);

        }

        // 教育
        if(msg.content.match('teach')) {
            teachCommand.doTeach(msg);

        }

        // 忘却
        if(msg.content.match('forget')) {
            teachCommand.doForget(msg);

        }

        // satomi
        if(msg.content.match('ask')) {
            if(Math.random() >= 0.5){
                msg.reply("はい")

            } else {
                msg.reply("いいえ")

            }

        }

    }

    console.log(msg.content)
    if(voiceChannelConnection && !msg.isMemberMentioned(client.user) && !(msg.author === client.user)) {

        let message = msg.content;

        // うにこーど絵文字置換
        message = emoji.replace(message, (emoji) => `:${emoji.key}:`)

        // Discordタグ置換
        message = DiscordTagReplacer.replace(message);

        // 辞書置換
        message = teachCommand.replace(message);

        // 文字数制限置換
        message = limitCommand.replace(message);

        console.log(message);

        const response = await axios.get(`http://localhost:4090/`, {
            responseType: 'stream',
            params : {
                text : message
            }
        });
        const sampleRate = parseInt(response.headers['ebyroid-pcm-sample-rate'], 10);
        const bitDepth = parseInt(response.headers['ebyroid-pcm-bit-depth'], 10);
        const numChannels = parseInt(response.headers['ebyroid-pcm-number-of-channels'], 10);

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

        streamCue.push(stream);

        if(playingDispatcher === undefined){
            playingDispatcher = voiceChannelConnection.playConvertedStream(streamCue.shift(0), { bitrate: 'auto' });
            playingDispatcher.on('end', value => playNextCue(value));

        }

    }
    
});

function playNextCue(flag) {
    const stream = streamCue.shift(0)
    console.log('streamCue', streamCue.length)
    if (stream !== undefined) {
        playingDispatcher = voiceChannelConnection.playConvertedStream(stream, { bitrate: 'auto' });
        playingDispatcher.on('end', value => playNextCue(value));

    } else {
        playingDispatcher = undefined;

    }
    
}

client.login(process.env.TOKEN);


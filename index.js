require('dotenv').config();
const Discord = require('discord.js');
const axios = require('axios').default;
const client = new Discord.Client();
const exitHook = require('exit-hook');
const SampleRate = require('node-libsamplerate');
const Interleaver = require('./interleaver').Interleaver;

const TeachCommand = require('./commands/teach').TeachCommand;
const teachCommand = new TeachCommand();

let voiceChannelConnection = undefined;
const cue = [];
let playingDispatcher = undefined;

client.on('ready', () => {
  console.log(`Logged in as ${client.user.tag}!`);
});

client.on('message', async (msg) =>
{
    if (msg.isMemberMentioned(client.user)) {

        // VC参加
        if(msg.content.match('plz')) {
            if(msg.member.voiceChannel) {
                // リプライしてきたユーザのボイスチャンネルに参加

                voiceChannelConnection = await msg.member.voiceChannel.join();
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
                voiceChannelConnection.disconnect();
        
            } else {
                msg.reply("どこのチャンネルにも参加していないか、エラーが発生しています :sob:");
            }

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
    if(voiceChannelConnection && !msg.isMemberMentioned(client.user)) {

        let message = msg.content;
        // Discordタグ置換
        const tagRe = /<(a?:.+?:\d+)?(@!\d+)?(@\d+)?>/g;
        const emojiRe = /:(.+):/;

        message = message.replace(tagRe, (tag, emojiTag, botTag, userTag) => {
            if (typeof emojiTag !== 'undefined') {
                let emojiName = emojiTag.match(emojiRe)[1];
                return emojiName; 
            }
            if (typeof userTag !== 'undefined') {
                let userId = userTag.slice(1);
                return "@" + msg.mentions.users.find("id", userId).username;
            }
            if (typeof botTag !== 'undefined') {
                let userId = botTag.slice(2);
                return "@" + msg.mentions.users.find("id", userId).username;
            }

            throw Error("unreachable");
        });

        // 辞書置換
        message = teachCommand.replaceText(message);

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
            stream = stream.pipe(new Interleaver());
        }

        const resample = new SampleRate({
            type: SampleRate.SRC_SINC_MEDIUM_QUALITY,
            channels: 2,
            fromRate: sampleRate,
            fromDepth: bitDepth,
            toRate: 48000,
            toDepth: 16
        });
        stream = stream.pipe(resample);

        cue.push(stream);

        if(playingDispatcher === undefined){
            playingDispatcher = voiceChannelConnection.playConvertedStream(cue.shift(0), { bitrate: 'auto' });
            playingDispatcher.on('end', value => playNextCue(value));

        }

    }
    
});

function playNextCue(flag) {
    const stream = cue.shift(0)
    console.log(cue.length)
    if (stream !== undefined) {
        playingDispatcher = voiceChannelConnection.playConvertedStream(stream, { bitrate: 'auto' });
        playingDispatcher.on('end', value => playNextCue(value));

    } else {
        playingDispatcher = undefined;

    }
    
}

client.login(process.env.TOKEN);


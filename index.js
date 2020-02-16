require('dotenv').config();
const Discord = require('discord.js');
const axios = require('axios').default;
const client = new Discord.Client();
const toStream = require('tostream');
const exitHook = require('exit-hook');
const SampleRate = require('node-libsamplerate');
const Interleaver = require('./interleaver').Interleaver;

let voiceChannelConnection = undefined;

client.on('ready', () => {
  console.log(`Logged in as ${client.user.tag}!`);
});

client.on('message', async (msg) =>
{
    if (msg.isMemberMentioned(client.user)) {

        // 参加させる
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

        // 切断
        if(msg.content.match('bye')) {
            if(voiceChannelConnection) {
                voiceChannelConnection.disconnect();
        
            } else {
                msg.reply("どこのチャンネルにも参加していないか、エラーが発生しています :sob:")
            }
        }

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
        const tagRe = /<(a?:.+?:\d+)?(@!\d+)?(@\d+)?>/g;
        const emojiRe = /:(.+):/;

        const message = msg.content.replace(tagRe, (tag, emojiTag, botTag, userTag) => {
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
        const dispatcher = voiceChannelConnection.playConvertedStream(stream, { bitrate: 'auto' });

    }

    
});

client.login(process.env.TOKEN);

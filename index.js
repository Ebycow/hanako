require('dotenv').config();
const Discord = require('discord.js');
const axios = require('axios').default;
const client = new Discord.Client();
const toStream = require('tostream');

let voiceChannelConnection = undefined;
let micInstance = undefined;

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
                    micInstance.stop();
        
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
        
        const data = (await axios.get(`http://localhost:4090/`, {
            params : {
                text : message
            }
        })).data;
        const buffer = new Buffer(data, 'base64');
        const readable = toStream(buffer)
        const dispatcher = voiceChannelConnection.playStream(readable, {
            bitrate : 48000
        });

    }

    
});

client.login(process.env.TOKEN);


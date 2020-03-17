require('dotenv').config();
const Discord = require('discord.js');
const client = new Discord.Client();
const path = require('path');
const log4js = require('log4js');
log4js.configure('./log4js-config.json');
const logger = log4js.getLogger(path.basename(__filename));

// TODO FIX DIのロード処理をちゃんとする

require('./src/infra/inmemory/inmemory_discord_server_cache');

// TODO FIX ここまで

const { GracefulShutdown } = require('./src/utils/shutdown');
const { ActionContext } = require('./src/contexts/actioncontext');
const { AudioAdapterManager } = require('./src/adapters/audioadapter');
const { FileAdapterManager } = require('./src/adapters/fileadapter');
const { RecoveryAdapterManager } = require('./src/adapters/recoveryadapter');
const MessageCtrl = require('./src/app/message_ctrl');

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

const tmp = new MessageCtrl(client, servers);
1 === tmp; // TODO FIX

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

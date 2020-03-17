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

// TODO FIX
logger.info(client);

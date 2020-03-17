require('dotenv').config();
require('log4js').configure('./log4js-config.json');

// TODO FIX DIのロード処理をちゃんとする

require('./src/infra/inmemory/inmemory_discord_server_cache');

// TODO FIX ここまで

const Client = require('discord.js').Client;
const Hanako = require('./src/hanako');

const hanako = new Hanako(process.env.TOKEN, new Client());
hanako.start();

require('dotenv').config();
require('log4js').configure('./log4js-config.json');

// TODO FIX DIのロード処理をちゃんとする

require('./src/infra/discord/discord_server_info_manager');
require('./src/infra/ebyroid/ebyroid_stream_api_adapter');
require('./src/infra/discord/discord_send_message_manager');
require('./src/infra/discord/discord_voice_queue_manager');
require('./src/infra/nedb/nedb_word_dictionary_table_manager');

// TODO FIX ここまで

// TODO DI設定はcoreを使ってhanakoがやるようにしてここはコンフィグのロードだけにする
const Injector = require('./src/core/injector');
const Client = require('discord.js').Client;
Injector.registerSingleton(Client, new Client());

const Application = require('./src/application');
new Application(process.env.TOKEN).start();

const { SlashCommandBuilder, Routes } = require('discord.js');
const { REST } = require('@discordjs/rest');
const AppSettings = require('./src/core/app_settings');

const appSettings = AppSettings.fromFile('./app-config-default.yml', './app-config.yml');

const commands = [
    new SlashCommandBuilder()
        .setName('plz')
        .setDescription(`はなこがボイスチャットを読み上げてくれます`)
        .toJSON(),
    new SlashCommandBuilder()
        .setName('bye')
        .setDescription(`はなこがボイスチャットから退出します．お疲れ！`)
        .toJSON(),
];

const rest = new REST({ version: '10' }).setToken(appSettings.discordBotToken);

rest.put(Routes.applicationGuildCommands(appSettings.discordClientId, appSettings.discordGuildId), { body: commands })
    .then(() => console.log('スラッシュコマンドの登録に成功しました'))
    .catch(console.error);

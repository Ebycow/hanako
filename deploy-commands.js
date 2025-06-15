const { SlashCommandBuilder, Routes } = require('discord.js');
const { REST } = require('@discordjs/rest');
const commandsIndex = require('./src/domain/model/commands');
const AppSettings = require('./src/core/app_settings');

const descriptions = {
    plz: 'はなこがボイスチャットを読み上げてくれます',
    bye: 'はなこがボイスチャットから退出します．お疲れ！',
    seibai: '読み上げを中断します',
    limit: '読み上げ文字数を制限します',
    speaker: '読み上げキャラクターを変更します',
    teach: '単語を登録します',
    dictionary: '登録済みの単語一覧を表示します',
    forget: '登録済みの単語を削除します',
    alldelete: '単語を全て削除します',
    'se-add': 'SEを追加します',
    'se-delete': 'SEを削除します',
    'se-rename': 'SEの名前を変更します',
    'se-dictionary': 'SE一覧を表示します',
    'blacklist-add': 'ユーザーをミュートします',
    'blacklist-remove': 'ユーザーのミュートを解除します',
    'blacklist-show': 'ミュート中のユーザー一覧を表示します',
    'blacklist-clear': 'ブラックリストを全て削除します',
    ask: 'はいかいいえで答えます',
    help: 'このbotの使い方を表示します',
};

function buildCommand(name, description) {
    return new SlashCommandBuilder()
        .setName(name)
        .setDescription(description)
        .addStringOption(o =>
            o
                .setName('args')
                .setDescription('引数')
                .setRequired(false)
        )
        .toJSON();
}

const slashCommands = [];
for (const CommandClass of Object.values(commandsIndex)) {
    const name = CommandClass.names.find(n => /^[a-z]/i.test(n)) || CommandClass.names[0];
    const desc = descriptions[name] || `${name} command`;
    slashCommands.push(buildCommand(name, desc));
}

const appSettings = AppSettings.fromFile('./app-config-default.yml', './app-config.yml');
const rest = new REST({ version: '10' }).setToken(appSettings.discordBotToken);

rest.put(Routes.applicationGuildCommands(appSettings.discordClientId, appSettings.discordGuildId), {
    body: slashCommands,
})
    .then(() => console.log('スラッシュコマンドの登録に成功しました'))
    .catch(console.error);

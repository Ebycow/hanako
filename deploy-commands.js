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
    new SlashCommandBuilder()
        .setName('help')
        .setDescription('コマンド一覧と使い方を表示します')
        .toJSON(),
    new SlashCommandBuilder()
        .setName('limit')
        .setDescription('読み上げる文字数の上限を設定します')
        .addIntegerOption(option =>
            option
                .setName('number')
                .setDescription('文字数の上限（例: 30）')
                .setRequired(true)
        )
        .toJSON(),
    new SlashCommandBuilder()
        .setName('teach')
        .setDescription('単語の読み替えを教育します')
        .addStringOption(option =>
            option
                .setName('from')
                .setDescription('置換前の単語')
                .setRequired(true)
        )
        .addStringOption(option =>
            option
                .setName('to')
                .setDescription('置換後の単語')
                .setRequired(true)
        )
        .toJSON(),
    new SlashCommandBuilder()
        .setName('forget')
        .setDescription('教育した単語を忘却します')
        .addStringOption(option =>
            option
                .setName('from')
                .setDescription('忘却する単語')
                .setRequired(true)
        )
        .toJSON(),
    new SlashCommandBuilder()
        .setName('dictionary')
        .setDescription('教育済みの単語一覧を表示します')
        .toJSON(),
    new SlashCommandBuilder()
        .setName('alldelete')
        .setDescription('すべての教育単語を削除します')
        .toJSON(),
    new SlashCommandBuilder()
        .setName('se-add')
        .setDescription('SE（効果音）を追加します')
        .addStringOption(option =>
            option
                .setName('keyword')
                .setDescription('SEを呼び出すキーワード')
                .setRequired(true)
        )
        .addStringOption(option =>
            option
                .setName('url')
                .setDescription('音声ファイルのURL（.wav, .mp3）')
                .setRequired(true)
        )
        .toJSON(),
    new SlashCommandBuilder()
        .setName('se-del')
        .setDescription('SEを削除します')
        .addStringOption(option =>
            option
                .setName('keyword')
                .setDescription('削除するSEのキーワード')
                .setRequired(true)
        )
        .toJSON(),
    new SlashCommandBuilder()
        .setName('se-list')
        .setDescription('SEの一覧を表示します')
        .toJSON(),
    new SlashCommandBuilder()
        .setName('se-rename')
        .setDescription('SEのキーワードを変更します')
        .addStringOption(option =>
            option
                .setName('old_keyword')
                .setDescription('現在のキーワード')
                .setRequired(true)
        )
        .addStringOption(option =>
            option
                .setName('new_keyword')
                .setDescription('新しいキーワード')
                .setRequired(true)
        )
        .toJSON(),
    new SlashCommandBuilder()
        .setName('se-search')
        .setDescription('SEをキーワードで検索します')
        .addStringOption(option =>
            option
                .setName('keyword')
                .setDescription('検索キーワード')
                .setRequired(true)
        )
        .toJSON(),
    new SlashCommandBuilder()
        .setName('blacklist-add')
        .setDescription('ユーザーをブラックリストに追加します')
        .addUserOption(option =>
            option
                .setName('user')
                .setDescription('ミュートするユーザー')
                .setRequired(true)
        )
        .toJSON(),
    new SlashCommandBuilder()
        .setName('blacklist-remove')
        .setDescription('ユーザーをブラックリストから除外します')
        .addUserOption(option =>
            option
                .setName('user')
                .setDescription('ミュート解除するユーザー')
                .setRequired(true)
        )
        .toJSON(),
    new SlashCommandBuilder()
        .setName('blacklist-show')
        .setDescription('ブラックリストの一覧を表示します')
        .toJSON(),
    new SlashCommandBuilder()
        .setName('blacklist-clear')
        .setDescription('ブラックリストをすべてクリアします')
        .toJSON(),
    new SlashCommandBuilder()
        .setName('speaker')
        .setDescription('読み上げキャラクターを変更します')
        .addStringOption(option =>
            option
                .setName('name')
                .setDescription('キャラクター名')
                .setRequired(true)
        )
        .toJSON(),
    new SlashCommandBuilder()
        .setName('seibai')
        .setDescription('現在読み上げ中の音声を中断します')
        .toJSON(),
    new SlashCommandBuilder()
        .setName('ask')
        .setDescription('運を天に任せます')
        .toJSON(),
];

const rest = new REST({ version: '10' }).setToken(appSettings.discordBotToken);

rest.put(Routes.applicationGuildCommands(appSettings.discordClientId, appSettings.discordGuildId), { body: commands })
    .then(() => console.log('スラッシュコマンドの登録に成功しました'))
    .catch(console.error);

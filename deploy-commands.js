const { Routes, InteractionContextType, ApplicationIntegrationType } = require('discord.js');
const { REST } = require('@discordjs/rest');
const AppSettings = require('./src/core/app_settings');
const { buildSlashCommandsJSON } = require('./src/service/slash_command_builder');

const appSettings = AppSettings.fromFile('./app-config-default.yml', './app-config.yml');

// スラッシュコマンドの定義は各コマンドクラスの static slash に書く
const commands = buildSlashCommandsJSON();

const rest = new REST({ version: '10' }).setToken(appSettings.discordBotToken);

// サーバー内でのみ使えるコマンドとして登録する（DMやユーザーインストールからは呼ばせない）
const body = commands.map((command) => ({
    ...command,
    contexts: [InteractionContextType.Guild],
    integration_types: [ApplicationIntegrationType.GuildInstall],
}));

async function deploy() {
    await rest.put(Routes.applicationCommands(appSettings.discordClientId), { body });
    console.log('スラッシュコマンドのグローバル登録に成功しました');

    // 以前ギルド単位で登録したコマンドが残っていると、グローバル登録分と二重に表示されるため削除する
    const guildId = appSettings.discordGuildId;
    if (/^\d+$/.test(guildId)) {
        await rest.put(Routes.applicationGuildCommands(appSettings.discordClientId, guildId), { body: [] });
        console.log(`ギルド(${guildId})に登録されていたスラッシュコマンドを削除しました`);
    }
}

deploy().catch((err) => {
    console.error(err);
    process.exitCode = 1;
});

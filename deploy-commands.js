const fs = require('fs');
const crypto = require('crypto');
const { REST, Routes, InteractionContextType, ApplicationIntegrationType } = require('discord.js');
const AppSettings = require('./src/core/app_settings');
const { buildSlashCommandsJSON, summarizeSlashCommands } = require('./src/service/slash_command_builder');

// --dry-run のときは登録せず、登録する内容の表だけを表示する
const dryRun = process.argv.includes('--dry-run');
// --if-changed のときは、前回登録した内容と同じなら Discord に送らない（起動のたびに実行するため）
const ifChanged = process.argv.includes('--if-changed');

// 前回登録した内容のハッシュ。db はボリュームに置かれるので、コンテナを作り直しても残る
const REGISTERED_HASH_PATH = './db/slash-commands.sha256';

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

/**
 * 全角文字を2桁として数えた表示幅
 *
 * @param {string} text
 * @returns {number}
 */
function displayWidth(text) {
    return Array.from(text).reduce((width, char) => width + (char.codePointAt(0) > 0xff ? 2 : 1), 0);
}

/**
 * 行の配列を罫線付きの表として表示する
 *
 * @param {Array<object>} rows 同じキーを持つオブジェクトの配列
 */
function printTable(rows) {
    const headers = Object.keys(rows[0]);
    const widths = headers.map((h) => Math.max(displayWidth(h), ...rows.map((row) => displayWidth(row[h]))));
    const pad = (text, width) => text + ' '.repeat(width - displayWidth(text));
    const line = (cells) => '│ ' + cells.map((cell, i) => pad(cell, widths[i])).join(' │ ') + ' │';
    const rule = (l, m, r) => l + widths.map((w) => '─'.repeat(w + 2)).join(m) + r;

    console.log(rule('┌', '┬', '┐'));
    console.log(line(headers));
    console.log(rule('├', '┼', '┤'));
    rows.forEach((row) => console.log(line(headers.map((h) => row[h]))));
    console.log(rule('└', '┴', '┘'));
}

/**
 * 登録する内容のハッシュ。登録先（CLIENT_ID・削除するギルド）が変わったときも登録し直す
 *
 * @returns {string}
 */
function registrationHash() {
    const target = { clientId: appSettings.discordClientId, guildId: appSettings.discordGuildId, body };
    return crypto.createHash('sha256').update(JSON.stringify(target)).digest('hex');
}

/**
 * @returns {string|null}
 */
function readRegisteredHash() {
    try {
        return fs.readFileSync(REGISTERED_HASH_PATH, 'utf8').trim();
    } catch {
        return null;
    }
}

async function deploy() {
    const hash = registrationHash();
    if (ifChanged && !dryRun && readRegisteredHash() === hash) {
        console.log('スラッシュコマンドは前回の登録から変わっていないため、登録を省きました');
        return;
    }

    // 登録する内容を表で確認できるようにする（「?」付きのオプションは省略可）
    printTable(summarizeSlashCommands());
    if (dryRun) {
        console.log('--dry-run のため登録はしていません');
        return;
    }

    await rest.put(Routes.applicationCommands(appSettings.discordClientId), { body });
    console.log('スラッシュコマンドのグローバル登録に成功しました');

    // 以前ギルド単位で登録したコマンドが残っていると、グローバル登録分と二重に表示されるため削除する
    const guildId = appSettings.discordGuildId;
    if (/^\d+$/.test(guildId)) {
        await rest.put(Routes.applicationGuildCommands(appSettings.discordClientId, guildId), { body: [] });
        console.log(`ギルド(${guildId})に登録されていたスラッシュコマンドを削除しました`);
    }

    // 登録はできているので、記録できなくても失敗にはしない（次回もう一度登録するだけ）
    try {
        fs.writeFileSync(REGISTERED_HASH_PATH, hash + '\n');
    } catch (err) {
        console.warn(`登録した内容を記録できませんでした: ${err.message}`);
    }
}

deploy().catch((err) => {
    console.error(err);
    process.exitCode = 1;
});

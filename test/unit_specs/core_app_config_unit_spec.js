require('chai').should();
const fs = require('fs');
const os = require('os');
const path = require('path');
const proxyquire = require('proxyquire').noCallThru();
const YAML = require('yaml');
const AppConfig = require('../../src/core/app_config');
const AppSettings = require('../../src/core/app_settings');

/************************************************************************
 * 設定ファイルと DI
 *
 * YAML とコードの対応がずれても、起動するまで気づけない。
 * 既定の設定ファイルそのものを読み、コードと噛み合っていることをここで固定する。
 ***********************************************************************/

const ROOT = path.resolve(__dirname, '../..');
const DEFAULT_CONFIG = path.join(ROOT, 'app-config-default.yml');

/** src 以下の .js を相対パスで列挙する */
function srcFiles() {
    return fs.globSync('src/**/*.js', { cwd: ROOT });
}

/** AppConfig#configure と同じ規則でクラス名をファイル名にする */
function snakeCase(name) {
    return name
        .replace(/([a-z0-9])([A-Z])/g, '$1_$2')
        .replace(/([A-Z])([A-Z][a-z])/g, '$1_$2')
        .toLowerCase();
}

function withTmpDir(fn) {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'hanako-config-'));
    try {
        return fn(dir);
    } finally {
        fs.rmSync(dir, { recursive: true, force: true });
    }
}

describe('app-config-default.yml', () => {
    const configurations = AppConfig.fromFile(DEFAULT_CONFIG, '/nonexistent/app-config.yml').configurations;

    specify('インターフェースの指定は重複しない', () => {
        const names = configurations.map((c) => c.interface);
        names.should.have.lengthOf(new Set(names).size);
    });

    configurations.forEach(({ interface: iname, dependent }) => {
        specify(`${iname} → ${dependent} の実装が存在し、インターフェースを満たす`, () => {
            const files = srcFiles();
            // Note: Windows では区切りが \ になるので、パスではなくファイル名で比べる
            const ifile = files.find((f) => path.basename(f) === `${snakeCase(iname)}.js`);
            const dfile = files.find((f) => path.basename(f) === `${snakeCase(dependent)}.js`);
            (ifile !== undefined).should.equal(true, `${iname} のファイルがない`);
            (dfile !== undefined).should.equal(true, `${dependent} のファイルがない`);

            const I = require(path.join(ROOT, ifile));
            const K = require(path.join(ROOT, dfile));
            K.name.should.equal(dependent);
            (K.prototype instanceof I).should.equal(true, `${dependent} が ${iname} を満たさない`);
        });
    });

    specify('既定の設定値から AppSettings を組み立てられる', () => {
        const settings = AppSettings.fromFile(DEFAULT_CONFIG, '/nonexistent/app-config.yml');
        settings.defaultCommandPrefix.should.equal('>');
        settings.foleyNormalizeTargetPeak.should.be.within(0, 1);
        settings.ebyroidStreamApiMode.should.equal('auto');
    });
});

describe('AppConfig', () => {
    specify('個別設定ファイルの指定で、同じインターフェースの実装だけを差し替える', () => {
        withTmpDir((dir) => {
            const base = path.join(dir, 'base.yml');
            const override = path.join(dir, 'override.yml');
            fs.writeFileSync(
                base,
                YAML.stringify({
                    configurations: [
                        { interface: 'IA', dependent: 'A1' },
                        { interface: 'IB', dependent: 'B1' },
                    ],
                })
            );
            fs.writeFileSync(override, YAML.stringify({ configurations: [{ interface: 'IA', dependent: 'A2' }] }));

            AppConfig.fromFile(base, override).configurations.should.deep.equal([
                { interface: 'IA', dependent: 'A2' },
                { interface: 'IB', dependent: 'B1' },
            ]);
        });
    });

    specify('ベースにないインターフェースは追加する', () => {
        withTmpDir((dir) => {
            const base = path.join(dir, 'base.yml');
            const override = path.join(dir, 'override.yml');
            fs.writeFileSync(base, YAML.stringify({ configurations: [{ interface: 'IA', dependent: 'A1' }] }));
            fs.writeFileSync(override, YAML.stringify({ configurations: [{ interface: 'IZ', dependent: 'Z1' }] }));
            AppConfig.fromFile(base, override)
                .configurations.map((c) => c.interface)
                .should.deep.equal(['IA', 'IZ']);
        });
    });

    specify('個別設定ファイルに configurations がなければベースのまま', () => {
        withTmpDir((dir) => {
            const base = path.join(dir, 'base.yml');
            const override = path.join(dir, 'override.yml');
            fs.writeFileSync(base, YAML.stringify({ configurations: [{ interface: 'IA', dependent: 'A1' }] }));
            fs.writeFileSync(override, YAML.stringify({ settings: { foo: 1 } }));
            AppConfig.fromFile(base, override).configurations.should.deep.equal([{ interface: 'IA', dependent: 'A1' }]);
        });
    });

    specify('#withDependent は元のコンフィグを変えずに、差し替えた新しいコンフィグを返す', () => {
        const original = new AppConfig([
            { interface: 'IA', dependent: 'A1' },
            { interface: 'IB', dependent: 'B1' },
        ]);
        const replaced = original.withDependent('IA', 'A2');
        replaced.configurations.should.deep.include({ interface: 'IA', dependent: 'A2' });
        replaced.configurations.should.have.lengthOf(2);
        original.configurations.should.deep.include({ interface: 'IA', dependent: 'A1' });
    });

    specify('#configurations を書き換えても中身は変わらない', () => {
        const config = new AppConfig([{ interface: 'IA', dependent: 'A1' }]);
        config.configurations.push({ interface: 'IX', dependent: 'X' });
        config.configurations.should.have.lengthOf(1);
    });
});

describe('AppSettings.fromFile', () => {
    const ENV_NAMES = ['DISCORD_BOT_TOKEN', 'DISCORD_CLIENT_ID', 'TTSHUB_URL', 'HELP_URL'];
    let savedEnv;

    beforeEach(() => {
        savedEnv = Object.fromEntries(ENV_NAMES.map((n) => [n, process.env[n]]));
        ENV_NAMES.forEach((n) => delete process.env[n]);
    });

    afterEach(() => {
        ENV_NAMES.forEach((n) => {
            if (savedEnv[n] === undefined) delete process.env[n];
            else process.env[n] = savedEnv[n];
        });
    });

    function writeOverride(dir, settings) {
        const file = path.join(dir, 'app-config.yml');
        fs.writeFileSync(file, YAML.stringify({ settings }));
        return file;
    }

    specify('個別設定ファイルのスネークケースの値で、既定値を上書きする', () => {
        withTmpDir((dir) => {
            const override = writeOverride(dir, { discord_bot_token: 'from-file', default_command_prefix: '!' });
            const settings = AppSettings.fromFile(DEFAULT_CONFIG, override);
            settings.discordBotToken.should.equal('from-file');
            settings.defaultCommandPrefix.should.equal('!');
            settings.foleyMaxAudioSeconds.should.equal(60, '上書きしていない値は既定のまま');
        });
    });

    specify('環境変数は設定ファイルより優先する', () => {
        withTmpDir((dir) => {
            const override = writeOverride(dir, { discord_bot_token: 'from-file' });
            process.env.DISCORD_BOT_TOKEN = 'from-env';
            process.env.TTSHUB_URL = 'http://ttshub:8790';
            const settings = AppSettings.fromFile(DEFAULT_CONFIG, override);
            settings.discordBotToken.should.equal('from-env');
            settings.ttshubUrl.should.equal('http://ttshub:8790');
        });
    });

    specify('空の環境変数では上書きしない', () => {
        withTmpDir((dir) => {
            const override = writeOverride(dir, { discord_bot_token: 'from-file' });
            process.env.DISCORD_BOT_TOKEN = '';
            AppSettings.fromFile(DEFAULT_CONFIG, override).discordBotToken.should.equal('from-file');
        });
    });

    specify('foleyNormalizeTargetPeak が範囲外なら組み立てられない', () => {
        withTmpDir((dir) => {
            const override = writeOverride(dir, { foley_normalize_target_peak: 1.5 });
            (() => AppSettings.fromFile(DEFAULT_CONFIG, override)).should.throw(/foleyNormalizeTargetPeak/);
        });
    });

    specify('知らない読み上げ API モードは受け付けない', () => {
        withTmpDir((dir) => {
            const override = writeOverride(dir, { ebyroid_stream_api_mode: 'websocket' });
            (() => AppSettings.fromFile(DEFAULT_CONFIG, override)).should.throw();
        });
    });
});

describe('Injector', () => {
    let Injector;

    // モジュールレベルに状態を持つので、テストごとに読み込み直す
    beforeEach(() => {
        Injector = proxyquire('../../src/core/injector', {});
    });

    class IRepo {}
    class Memory {
        constructor(dep) {
            this.dep = dep;
        }
    }
    class Disk {}
    class Settings {}

    specify('コンフィグで選んだ実装を生成する', () => {
        Injector.register(IRepo, Memory);
        Injector.register(IRepo, Disk);
        Injector.configure([{ interface: 'IRepo', dependent: 'Disk' }]);
        Injector.resolve(IRepo).should.be.an.instanceOf(Disk);
    });

    specify('コンストラクタ引数の型はシングルトンから解決する', () => {
        const settings = new Settings();
        Injector.registerSingleton(Settings, settings);
        Injector.register(IRepo, Memory, [Settings]);
        Injector.configure([{ interface: 'IRepo', dependent: 'Memory' }]);
        Injector.resolve(IRepo).dep.should.equal(settings);
    });

    specify('resolve のたびに新しいインスタンスを作る（シングルトンを除く）', () => {
        Injector.register(IRepo, Disk);
        Injector.configure([{ interface: 'IRepo', dependent: 'Disk' }]);
        Injector.resolve(IRepo).should.not.equal(Injector.resolve(IRepo));
    });

    specify('実装が一つも登録されていなければエラー', () => {
        Injector.configure([]);
        (() => Injector.resolve(IRepo)).should.throw(/No implementation/);
    });

    specify('コンフィグに書かれていないインターフェースはエラー', () => {
        Injector.register(IRepo, Disk);
        Injector.configure([]);
        (() => Injector.resolve(IRepo)).should.throw(/not configured/);
    });

    specify('コンフィグで指定した実装が登録されていなければエラー', () => {
        Injector.register(IRepo, Disk);
        Injector.configure([{ interface: 'IRepo', dependent: 'Typo' }]);
        (() => Injector.resolve(IRepo)).should.throw(/No such implementation Typo/);
    });

    specify('同じ実装の二重登録、二度目の configure、シングルトンの二重登録はエラー', () => {
        Injector.register(IRepo, Disk);
        (() => Injector.register(IRepo, Disk)).should.throw(/twice/);
        Injector.configure([]);
        (() => Injector.configure([])).should.throw(/twice/);
        Injector.registerSingleton(Settings, new Settings());
        (() => Injector.registerSingleton(Settings, new Settings())).should.throw(/once/);
    });
});

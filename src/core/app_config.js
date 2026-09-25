const path = require('path');
const logger = require('log4js').getLogger(path.basename(__filename));
const assert = require('assert').strict;
const fs = require('fs');
const YAML = require('yaml');
const Injector = require('./injector');

/**
 * クラス名をスネークケースのファイル名に変換
 *
 * @param {string} name 変換する名前 (例: DiscordServerInfoManager)
 * @returns {string} 変換された名前 (例: discord_server_info_manager)
 */
function snakeCase(name) {
    return name
        .replace(/([a-z0-9])([A-Z])/g, '$1_$2')
        .replace(/([A-Z])([A-Z][a-z])/g, '$1_$2')
        .split(/[^A-Za-z0-9]+/)
        .filter((word) => word.length > 0)
        .join('_')
        .toLowerCase();
}

/**
 * 読み上げ花子アプリケーションのDIコンフィグ
 */
class AppConfig {
    /**
     * YAMLファイルからコンフィグをロード
     *
     * @param {string} basePath デフォルトファイルへのパス
     * @param {string} overridePath 個別設定ファイルへのパス
     */
    static fromFile(basePath, overridePath) {
        const base = YAML.parse(fs.readFileSync(basePath, 'utf8')).configurations;
        let override;
        if (fs.existsSync(overridePath)) {
            override = YAML.parse(fs.readFileSync(overridePath, 'utf8')).configurations || [];
        } else {
            logger.warn(`設定ファイル "${overridePath}" が見当たりません。`);
            logger.warn(`このため、全てデフォルト設定ファイルの値を使用します。`);
            override = [];
        }

        const overrider = (array, ovc) => {
            const index = array.findIndex((c) => c.interface === ovc.interface);
            if (index > -1) {
                return [array.slice(0, index), [ovc], array.slice(index + 1)].flat();
            } else {
                logger.warn(`ベースファイル "${basePath}" に存在しない依存性を追加しました: ${ovc.interface}`);
                return [...array, ovc];
            }
        };
        const data = override.reduce(overrider, base);
        return new AppConfig(data);
    }

    /**
     * アプリケーションのDIコンフィグを構築
     *
     * @param {Array<{interface:string, dependent:string}>} data
     */
    constructor(data) {
        assert(typeof data === 'object' && Array.isArray(data));
        assert(data.every((elem) => typeof elem.interface === 'string'));
        assert(data.every((elem) => typeof elem.dependent === 'string'));

        Object.defineProperty(this, 'data', {
            value: data.slice(),
            writable: false,
            enumerable: false,
            configurable: false,
        });
    }

    /**
     * アプリケーションのDIコンフィグ
     *
     * @type {Array<{interface:string, dependent:string>}}
     */
    get configurations() {
        return this.data.slice();
    }

    /**
     * DIコンフィグを適用する
     */
    configure() {
        // InjectorにDIコンフィグを設定する
        Injector.configure(this.configurations);

        // DIコンフィグに従って依存クラスをプリロードする
        const allFiles = fs.globSync('src/**/*.js').map((file) => fs.realpathSync(file));
        const dependentFileNames = [...new Set(this.configurations.map((c) => `${snakeCase(c.dependent)}.js`))];
        const dependentFiles = allFiles.filter((file) => dependentFileNames.some((name) => file.endsWith(name)));

        if (dependentFileNames.length !== dependentFiles.length) {
            throw new TypeError(`Missing dependent file(s).\n${dependentFileNames}\n${dependentFiles}`);
        }

        const loadedClasses = dependentFiles.map((file) => require(file));
        logger.trace(`依存クラスをロードした${loadedClasses.map((K, i) => `\n\t${i + 1}. ${K.name}`).join('')}`);
    }
}

module.exports = AppConfig;

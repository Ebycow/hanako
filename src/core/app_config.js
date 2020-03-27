const path = require('path');
const logger = require('log4js').getLogger(path.basename(__filename));
const assert = require('assert').strict;
const fs = require('fs');
const glob = require('glob');
const snakeCase = require('snake-case').snakeCase;
const YAML = require('yaml');
const Injector = require('./injector');

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
            const index = array.findIndex(c => c.interface === ovc.interface);
            if (index > -1) {
                array.splice(index, 1, ovc);
            }
            return array;
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
        assert(data.every(elem => typeof elem.interface === 'string'));
        assert(data.every(elem => typeof elem.dependent === 'string'));

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
        const allFiles = glob.sync('./src/**/*.js', { realpath: true });
        const dependentFileNames = [...new Set(this.configurations.map(c => `${snakeCase(c.dependent)}.js`))];
        const dependentFiles = allFiles.filter(file => dependentFileNames.some(name => file.endsWith(name)));

        if (dependentFileNames.length !== dependentFiles.length) {
            throw new TypeError(`Missing dependent file(s).\n${dependentFileNames}\n${dependentFiles}`);
        }

        const loadedClasses = dependentFiles.map(file => require(file));
        logger.info(`依存クラスをロードした${loadedClasses.map((K, i) => `\n\t${i + 1}. ${K.name}`).join('')}`);
    }
}

module.exports = AppConfig;

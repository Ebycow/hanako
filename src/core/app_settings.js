const path = require('path');
const logger = require('log4js').getLogger(path.basename(__filename));
const assert = require('assert').strict;
const fs = require('fs');
const camelCase = require('camel-case').camelCase;
const YAML = require('yaml');

/**
 * オブジェクトキーをキャメルケースに固定
 *
 * @param {object} obj 変換するオブジェクト
 * @returns {object} 変換されたオブジェクト
 */
function coerceCase(obj) {
    const entries = Array.from(Object.entries(obj));
    const coercedEntries = entries.map(([key, value]) => [camelCase(key), value]);
    return Object.fromEntries(coercedEntries);
}

/**
 * 読み上げ花子アプリケーション全体の設定
 */
class AppSettings {
    /**
     * YAMLファイルから設定をロード
     *
     * @param {string} basePath デフォルトファイルへのパス
     * @param {string} overridePath 個別設定ファイルへのパス
     */
    static fromFile(basePath, overridePath) {
        const base = coerceCase(YAML.parse(fs.readFileSync(basePath, 'utf8')).settings);
        let override;
        if (fs.existsSync(overridePath)) {
            override = coerceCase(YAML.parse(fs.readFileSync(overridePath, 'utf8')).settings || {});
        } else {
            logger.warn(`設定ファイル "${overridePath}" が見当たりません。`);
            logger.warn(`このため、全てデフォルト設定ファイルの値を使用します。`);
            override = {};
        }
        const data = Object.assign({}, base, override);
        return new AppSettings(data);
    }

    /**
     * アプリケーション設定を構築
     *
     * @param {object} data
     * @param {string} data.defaultCommandPrefix
     * @param {string} data.discordBotToken
     * @param {string} data.ebyroidStreamApiUrl
     */
    constructor(data) {
        assert(typeof data === 'object');
        assert(typeof data.defaultCommandPrefix === 'string');
        assert(typeof data.discordBotToken === 'string');
        assert(typeof data.ebyroidStreamApiUrl === 'string');

        Object.defineProperty(this, 'data', {
            value: Object.assign({}, data),
            writable: false,
            enumerable: false,
            configurable: false,
        });
    }

    /**
     * コマンドプリフィクスのデフォルト値
     *
     * @type {string}
     */
    get defaultCommandPrefix() {
        return this.data.defaultCommandPrefix;
    }

    /**
     * Discord Botのトークン
     *
     * @type {string}
     */
    get discordBotToken() {
        return this.data.discordBotToken;
    }

    /**
     * Ebyroidの音声ストリーム変換APIのエンドポイント
     *
     * @type {string}
     */
    get ebyroidStreamApiUrl() {
        return this.data.ebyroidStreamApiUrl;
    }
}

module.exports = AppSettings;

// Log4jsを設定
require('./src/core/logging').configure('./log4js-config.json');

const AppConfig = require('./src/core/app_config');
const AppSettings = require('./src/core/app_settings');
const Application = require('./src/application');

let appConfig = AppConfig.fromFile('./app-config-default.yml', './app-config.yml');
const appSettings = AppSettings.fromFile('./app-config-default.yml', './app-config.yml');

// ttshub の URL があれば、Ebyroid に直接つながず ttshub で読み上げる
if (appSettings.ttshubUrl) {
    appConfig = appConfig
        .withDependent('IVoiceroidStreamRepo', 'TtshubStreamApiAdapter')
        .withDependent('IVoiceCatalogRepo', 'TtshubVoiceCatalogAdapter');
}

new Application(appConfig, appSettings).start();

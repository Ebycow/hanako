// Log4jsを設定
require('log4js').configure('./log4js-config.json');

const AppConfig = require('./src/core/app_config');
const AppSettings = require('./src/core/app_settings');
const Application = require('./src/application');

const appConfig = AppConfig.fromFile('./app-config-default.yml', './app-config.yml');
const appSettings = AppSettings.fromFile('./app-config-default.yml', './app-config.yml');

new Application(appConfig, appSettings).start();

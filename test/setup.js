// テスト環境セットアップ
// log4jsのログ出力を抑制する
require('log4js').configure({
    appenders: { out: { type: 'stdout' } },
    categories: { default: { appenders: ['out'], level: 'off' } },
});

/**
 * コマンドモデル読み込み用インデックス
 */
module.exports = {
    ask: require('./ask_command'),
    join: require('./join_command'),
    leave: require('./leave_command'),
    seibai: require('./seibai_command'),
    limit: require('./limit_command'),
    word_create: require('./word_create_command'),
    word_read: require('./word_read_command'),
    word_delete: require('./word_delete_command'),
    word_clear: require('./word_clear_command'),
    silence_create: require('./silence_create_command'),
    silence_read: require('./slience_read_command'),
    silence_delete: require('./silence_delete_command'),
    silence_clear: require('./silence_clear_command'),
};

/*******************************************************
 * JSDoc定義
 *
 * CommandT: 花子のコマンドモデルの直和型
 *******************************************************/

/** @typedef {import('./ask_command')} Ask */
/** @typedef {import('./join_command')} Join */
/** @typedef {import('./leave_command')} Leave */
/** @typedef {import('./seibai_command')} Seibai */
/** @typedef {import('./limit_command')} Limit */
/** @typedef {import('./word_create_command')} WordCreate */
/** @typedef {import('./word_read_command')} WordRead */
/** @typedef {import('./word_delete_command')} WordDelete */
/** @typedef {import('./word_clear_command')} WordClear */
/** @typedef {import('./silence_create_command')} SilenceCreate */
/** @typedef {import('./silence_read_command')} SilenceRead */
/** @typedef {import('./silence_delete_command')} SilenceDelete */
/** @typedef {import('./silence_clear_command')} SilenceClear */

/**
 * コマンドモデル直和型
 *
 * @typedef CommandT
 * @type {Ask|Join|Leave|Seibai|Limit|WordCreate|WordRead|WordDelete|SilenceCreate|SilenceRead|SilenceDelete|SilenceClear}
 */

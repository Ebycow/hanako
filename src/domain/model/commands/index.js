/**
 * コマンドモデル読み込み用インデックス
 */
module.exports = {
    ask: require('./ask_command'),
    join: require('./join_command'),
    leave: require('./leave_command'),
    seibai: require('./seibai_command'),
    word_create: require('./word_create_command'),
    word_read: require('./word_read_command'),
    word_delete: require('./word_delete_command'),
    word_clear: require('./word_clear_command'),
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
/** @typedef {import('./word_create_command')} WordCreate */
/** @typedef {import('./word_read_command')} WordRead */
/** @typedef {import('./word_delete_command')} WordDelete */
/** @typedef {import('./word_clear_command')} WordClear */

/**
 * コマンドモデル直和型
 *
 * @typedef CommandT
 * @type {Ask|Join|Leave|Seibai|WordCreate|WordRead|WordDelete}
 */

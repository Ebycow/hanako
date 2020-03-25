module.exports = {};

/*******************************************************
 * JSDoc定義
 *
 * ResponseT: 花子のレスポンスエンティティの直和型
 *******************************************************/

/** @typedef {import('./action_response')} Action */
/** @typedef {import('./chat_response')} Chat */
/** @typedef {import('./silent_response')} Silent */
/** @typedef {import('./voice_response')} Voice */

/**
 * レスポンスエンティティ直和型
 *
 * @typedef ResponseT
 * @type {Action|Chat|Silent|Voice}
 */

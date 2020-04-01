module.exports = {};

/*******************************************************
 * JSDoc定義
 *
 * ActionT: 花子のアクションエンティティの直和型
 *******************************************************/

/** @typedef {import('./join_voice_action')} JoinVoice */
/** @typedef {import('./leave_voice_action')} LeaveVoice */
/** @typedef {import('./seibai_action')} SeibaiAction */
/** @typedef {import('./word_create_action')} WordCreate */
/** @typedef {import('./word_delete_action')} WordDelete */
/** @typedef {import('./word_clear_action')} WordClear */
/** @typedef {import('./silence_create_action')} SilenceCreate */
/** @typedef {import('./silence_delete_action')} SilenceDelete */
/** @typedef {import('./silence_clear_action')} SilenceClear */
/** @typedef {import('./foley_create_action')} FoleyCreate */
/** @typedef {import('./foley_delete_action')} FoleyDelete */
/** @typedef {import('./max_count_update_action')} MaxCountUpdateAction */

/**
 * アクションエンティティ直和型
 *
 * @typedef ActionT
 * @type {JoinVoice|LeaveVoice|SeibaiAction|WordCreate|WordDelete|WordClear|SilenceCreate|SilenceDelete|SilenceClear|FoleyCreate|FoleyDelete|MaxCountUpdateAction}
 */

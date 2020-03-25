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

/**
 * アクションエンティティ直和型
 *
 * @typedef ActionT
 * @type {JoinVoice|LeaveVoice|SeibaiAction|WordCreate}
 */
module.exports = {};

/*******************************************************
 * JSDoc定義
 *
 * AudioT: 花子のオーディオエンティティの直和型
 * InternalAudioT: Readerモデル内部向けの直和型
 *******************************************************/

/** @typedef {import('./noop')} Noop */
/** @typedef {import('./plain')} Plain */
/** @typedef {import('./voiceroid_audio')} Voiceroid */

/**
 * オーディオエンティティ直和型
 *
 * @typedef AudioT
 * @type {Voiceroid}
 */

/**
 * Readerモデル内部向けAudio直和型
 * NoopとPlainを含む
 *
 * @typedef InternalAudioT
 * @type {AudioT|Noop|Plain}
 */

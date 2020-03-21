/**
 * 花子の音声変換手続きエンティティの直和型
 *
 * JSDocのための定義なので、実際に require で参照しないこと。
 */
class Audio {
    // TODO テスト用の

    /**
     * 音声変換手続きタイプ
     *
     * @type {'voiceroid'}
     */
    get type() {
        throw new Error('unreachable');
    }

    constructor() {
        throw new Error('unreachable');
    }
}

/**
 * Readerモデル内部向けAudio直和型
 * NoopとPlainを含む
 *
 * @typedef {Audio|import('./noop')|import('./plain')} InternalAudioT
 */

module.exports = Audio;

const assert = require('assert').strict;

/**
 * オーディオエンティティ
 * ボイスロイド音声読み上げ
 */
class VoiceroidAudio {
    /**
     * @type {'voiceroid'}
     */
    get type() {
        return 'voiceroid';
    }

    /**
     * VoiceroidAudioエンティティを構築する
     * 空の内容のときTypeError
     *
     * @param {object} data
     * @param {string} data.content 読み上げ内容
     * @param {string} [data.speaker='kiritan'] 話者（現在きりたん固定）
     */
    constructor(data) {
        assert(typeof data.content === 'string');
        assert(typeof data.speaker === 'undefined' || data.speaker === 'kiritan');

        if (data.content.length === 0) {
            throw new TypeError('0文字の読み上げは不正');
        }

        const speaker = data.speaker || 'kiritan';

        Object.defineProperty(this, 'data', {
            value: Object.assign({}, data, { speaker }),
            writable: false,
            enumerable: true,
            configurable: false,
        });
    }

    /**
     * エンティティID
     *
     * @type {string}
     */
    get id() {
        return Buffer.from(this.data.content + this.data.speaker).toString('base64');
    }

    /**
     * 読み上げ内容
     *
     * @type {string}
     */
    get content() {
        return this.data.content;
    }

    /**
     * 話者
     * TODO FUTURE ここを多様にして複数VR対応する
     *
     * @type {'kiritan'}
     */
    get speaker() {
        return this.data.speaker;
    }

    toString() {
        return `VoiceroidAudio(id=${this.id}, content=${this.content}, speaker=${this.speaker})`;
    }
}

module.exports = VoiceroidAudio;

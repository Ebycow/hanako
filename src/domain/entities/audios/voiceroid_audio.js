const assert = require('assert').strict;

/**
 * オーディオエンティティ
 * ボイスロイド
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
    constructor({ content, speaker = 'kiritan' }) {
        assert(typeof content === 'string');
        assert(speaker === 'kiritan');

        if (content.length === 0) {
            throw new TypeError('0文字の読み上げは不正');
        }

        const data = { content, speaker };
        Object.defineProperty(this, 'data', {
            value: data,
            writable: false,
            enumerable: true,
            configurable: false,
        });
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
        return `VoiceroidAudio(content=${this.content}, speaker=${this.speaker})`;
    }
}

module.exports = VoiceroidAudio;

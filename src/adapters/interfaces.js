/**
 * 音声ストリームを取得するアダプタクラスの共通インターフェイス
 */
class AudioStreamAdapter {
    /**
     * @param {AudioRequest} request
     * @returns {Promise<Readable>}
     * @abstract
     */
    async requestAudioStream(request) {
        throw new Error('not implemented');
    }

    static [Symbol.hasInstance](instance) {
        if (instance.requestAudioStream) {
            return true;
        } else {
            return false;
        }
    }
}

module.exports = {
    AudioStreamAdapter,
};

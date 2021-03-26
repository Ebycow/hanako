const Interface = require('../../core/interface');

/** @typedef {import('stream').Readable} Readable */
/** @typedef {import('../entity/audios/foley_audio')} FoleyAudio */

/**
 * SE音声ストリームリポジトリ
 */
class IFoleyStreamRepo extends Interface {
    /**
     * オーディオエンティティに対応する音声ストリームを取得
     *
     * @param {FoleyAudio} audio SEオーディオエンティティ
     * @returns {Promise<Readable>} 16-bit 48kHz StereoのPCMオーディオストリーム
     */
    async getFoleyStream(audio) {}
}

module.exports = IFoleyStreamRepo;

const assert = require('assert').strict;
const Injector = require('../../core/injector');
const IVoiceroidStreamRepo = require('../repo/i_voiceroid_stream_repo');
const IFoleyStreamRepo = require('../repo/i_foley_stream_repo');
const EbyStream = require('../../library/ebystream');
const transforms = require('../../library/transforms');

/** @typedef {import('../entity/audios').AudioT} AudioT */
/** @typedef {import('stream').Readable} Readable */

/**
 * ドメインサービス
 * オーディオエンティティから音声ストリームを取得
 */
class StreamFetcher {
    /**
     * @param {null} vrStreamRepo DI
     * @param {null} foleyStreamRepo DI
     */
    constructor(vrStreamRepo = null, foleyStreamRepo = null) {
        this.vrStreamRepo = vrStreamRepo || Injector.resolve(IVoiceroidStreamRepo);
        this.foleyStreamRepo = foleyStreamRepo || Injector.resolve(IFoleyStreamRepo);
    }

    /**
     * 音声読み上げ手続きの配列を音声ストリームに変換
     *
     * @param {Array<AudioT>} audios 音声読み上げ手続きの配列
     * @returns {Promise<Readable>} 音声ストリーム
     */
    async fetch(audios) {
        assert(typeof audios === 'object' && Array.isArray(audios));

        const lastIndex = audios.length - 1;

        // Promise<Readable>の配列に変換
        const promises = audios.map((audio, index) => {
            // 手続きタイプによって各リポジトリに振り分け
            if (audio.type === 'voiceroid') {
                const p = this.vrStreamRepo.getVoiceroidStream(audio);
                // 末尾でないVoiceroid音声は無音トリミングを適用（SE等との結合時にスムーズにする）
                if (index < lastIndex) {
                    return p.then((stream) => stream.pipe(new transforms.TrailingSilenceTrimmer()));
                }
                return p;
            } else if (audio.type === 'foley') {
                return this.foleyStreamRepo.getFoleyStream(audio);
            } else {
                throw new Error('unreachable');
            }
        });

        // 待機
        const streams = await Promise.all(promises);

        // EbyStreamを使ってひとつなぎのStreamとして返却
        const stream = new EbyStream(streams);
        return Promise.resolve(stream);
    }
}

module.exports = StreamFetcher;

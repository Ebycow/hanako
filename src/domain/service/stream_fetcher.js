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
        if (audios.some((audio) => audio.type !== 'voiceroid' && audio.type !== 'foley')) {
            throw new Error('unreachable');
        }

        // 順次取得するReadable生成関数の配列に変換
        const streamFactories = audios.map((audio) => async () => {
            // 手続きタイプによって各リポジトリに振り分け
            if (audio.type === 'voiceroid') {
                const stream = await this.vrStreamRepo.getVoiceroidStream(audio);
                // VOICEROIDが付加する長い末尾無音を、単一音声を含め常に除去する。
                // 除去しないと、声が聞こえ終わった後も次のキューが約800ms待たされる。
                return stream.pipe(new transforms.TrailingSilenceTrimmer());
            } else if (audio.type === 'foley') {
                return this.foleyStreamRepo.getFoleyStream(audio);
            } else {
                throw new Error('unreachable');
            }
        });

        // 待機
        // EbyStreamを使ってひとつなぎのStreamとして返却
        const stream = new EbyStream(streamFactories);
        return Promise.resolve(stream);
    }
}

module.exports = StreamFetcher;

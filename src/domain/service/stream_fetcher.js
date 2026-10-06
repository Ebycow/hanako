const path = require('path');
const logger = require('log4js').getLogger(path.basename(__filename));
const assert = require('assert').strict;
const { compose } = require('stream');
const Injector = require('../../core/injector');
const IVoiceroidStreamRepo = require('../repo/i_voiceroid_stream_repo');
const IFoleyStreamRepo = require('../repo/i_foley_stream_repo');
const EbyStream = require('../../library/ebystream');
const transforms = require('../../library/transforms');

// 1つの発言の中で、再生中の区切りより先に取得しておく数
// SEの後の長文など、合成に時間がかかる区切りを前の区切りの再生中に取り始め、途切れを短くする。
const LOOKAHEAD = 2;

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
        const streamFactories = audios.map((audio) => async (signal) => {
            // 手続きタイプによって各リポジトリに振り分け
            if (audio.type === 'voiceroid') {
                const stream = await this.vrStreamRepo.getVoiceroidStream(audio, signal);
                // VOICEROIDが付加する長い末尾無音を、単一音声を含め常に除去する。
                // 除去しないと、声が聞こえ終わった後も次のキューが約800ms待たされる。
                // pipeでは破棄が上流へ伝わらずHTTPレスポンスが残るため、composeでつなぐ。
                return compose(stream, new transforms.TrailingSilenceTrimmer());
            } else if (audio.type === 'foley') {
                return this.foleyStreamRepo.getFoleyStream(audio);
            } else {
                throw new Error('unreachable');
            }
        });

        // EbyStreamを使ってひとつなぎのStreamとして返却
        // 取得は再生の直前（先読み）か読み取り開始時に始まり、破棄されると中断される
        const stream = new EbyStream(streamFactories, { lookahead: LOOKAHEAD });
        // 取得は返却後に進むため、先読み中に失敗しても uncaughtException にならないよう常に受けておく
        // （再生中の失敗は AudioPlayer の error でも拾われ、次の音声へ進む）
        stream.on('error', (err) => logger.warn('音声ストリームの取得に失敗', err));
        return Promise.resolve(stream);
    }
}

module.exports = StreamFetcher;

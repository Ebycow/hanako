const FoleyAudio = require('../../entity/audios/foley_audio');
const Noop = require('../../entity/audios/noop');
const Plain = require('../../entity/audios/plain');

/** @typedef {import('../../model/hanako')} Hanako */
/** @typedef {import('../../entity/audios').InternalAudioT} InternalAudioT */
/** @typedef {import('../../entity/foley_dictionary_line')} FoleyDictionaryLine */

/**
 * ドメインモデル
 * SEオーディオReader
 * - SEキーワードを含むPlainを分割してSEオーディオに置換する
 */
class FoleyReader {
    /**
     * @type {'foley'}
     */
    get type() {
        return 'foley';
    }

    /**
     * @param {Hanako} hanako 読み上げ実行下の読み上げ花子モデル
     */
    constructor(hanako) {
        this.hanako = hanako;
    }

    /**
     * 読み上げ（SEキーワード↔SEオーディオ変換）処理
     *
     * @param {InternalAudioT} value 入力エンティティ
     * @returns {Array<InternalAudioT>} 構築結果 Audioエンティティの配列
     */
    read(value) {
        if (value.type !== 'plain') {
            return [value];
        }

        /**
         * @param {InternalAudioT} plain
         * @param {FoleyDictionaryLine} line
         * @returns {Array<InternalAudioT>}
         */
        const wrap = (plain, line) => {
            if (plain.type !== 'plain') {
                return [plain];
            }

            if (plain.content.includes(line.keyword)) {
                const newFoley = () => new FoleyAudio({ serverId: this.hanako.serverId, foleyId: line.id });
                return plain.content
                    .split(line.keyword)
                    .map(s => (s === '' ? new Noop() : new Plain({ content: s })))
                    .map(v => [v])
                    .reduceRight((rhs, lhs) => lhs.concat([newFoley()], rhs));
            } else {
                return [plain];
            }
        };

        return this.hanako.foleyDictionary.lines.reduce((acc, line) => acc.map(v => wrap(v, line)).flat(), [value]);
    }
}

module.exports = FoleyReader;

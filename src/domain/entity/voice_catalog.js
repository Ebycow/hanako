const assert = require('assert').strict;

/** @typedef {import('../repo/i_voice_catalog_repo').VoiceInfo} VoiceInfo */

/**
 * 別名・プリセット
 *
 * @typedef NamedVoice
 * @type {object}
 * @property {string} name 別名、または `preset:` を付けたプリセット名
 * @property {string} target 指す先の指定
 */

/**
 * エンティティ
 * 読み上げキャラクター（話者）の一覧
 * ページ送りで表示できる（キャラごとに1行、スタイルは並べて書く）
 */
class VoiceCatalog {
    /**
     * 一覧を持たない環境（Ebyroid に直接つなぐ場合など）の空の一覧
     *
     * @returns {VoiceCatalog}
     */
    static unavailable() {
        return new VoiceCatalog({ available: false, voices: [], named: [] });
    }

    /**
     * @param {object} data
     * @param {boolean} data.available 一覧を取得できたか
     * @param {Array<VoiceInfo>} data.voices 話者
     * @param {Array<NamedVoice>} data.named 別名・プリセット
     */
    constructor(data) {
        assert(typeof data.available === 'boolean');
        assert(Array.isArray(data.voices));
        assert(data.voices.every((v) => typeof v.address === 'string'));
        assert(Array.isArray(data.named));
        assert(data.named.every((n) => typeof n.name === 'string' && typeof n.target === 'string'));

        Object.defineProperty(this, 'data', {
            value: { available: data.available, voices: data.voices.slice(), named: data.named.slice() },
            writable: false,
            enumerable: true,
            configurable: false,
        });
    }

    /**
     * 一覧を取得できたか
     *
     * @type {boolean}
     */
    get available() {
        return this.data.available;
    }

    /**
     * 話者
     *
     * @type {Array<VoiceInfo>}
     */
    get voices() {
        return this.data.voices.slice();
    }

    /**
     * 別名・プリセット
     *
     * @type {Array<NamedVoice>}
     */
    get named() {
        return this.data.named.slice();
    }

    /**
     * ページ送りの行。キャラごとに1行にまとめ、最後に別名・プリセットを並べる
     * エンジンが止まっているキャラには停止中と書く（設定済みの声が消えたように見えないよう、一覧からは外さない）
     *
     * @type {Array<{line: string}>}
     */
    get lines() {
        const groups = new Map();
        for (const voice of this.data.voices) {
            // `voicevox:ずんだもん/あまあま` → `voicevox:ずんだもん`（キャラ名に `/` は残らない）
            const base = voice.address.split('/')[0];
            if (!groups.has(base)) {
                groups.set(base, { base, character: voice.character, styles: [], available: false });
            }
            if (voice.available !== false) {
                groups.get(base).available = true;
            }
            if (voice.style) {
                groups.get(base).styles.push(voice.style);
            }
        }
        const voiceLines = Array.from(groups.values()).map(({ base, character, styles, available }) => {
            // 指定に使う名前と元の名前が違うときは（小夜/SAYO → 小夜-sayo）、元の名前も書く
            const slug = base.slice(base.indexOf(':') + 1);
            const original = character && character !== slug ? `（${character}）` : '';
            const styleList = styles.length > 0 ? ` ${styles.join(' / ')}` : '';
            const stopped = available ? '' : ' （停止中）';
            return { line: `\`${base}\`${original}${styleList}${stopped}` };
        });
        const namedLines = this.data.named.map((n) => ({ line: `\`${n.name}\` → ${n.target}` }));
        return [...voiceLines, ...namedLines];
    }

    /**
     * @type {number}
     */
    get linesPerPage() {
        return 10;
    }

    /**
     * @type {string}
     */
    get descriptor() {
        return 'speakers';
    }

    toString() {
        return `VoiceCatalog(available=${this.available}, voices=${this.data.voices.length}, named=${this.data.named.length})`;
    }
}

module.exports = VoiceCatalog;

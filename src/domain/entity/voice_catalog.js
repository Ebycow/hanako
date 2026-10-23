const assert = require('assert').strict;

/**
 * 読み上げキャラクター（キャラごとにまとめた話者）
 *
 * @typedef VoiceCharacter
 * @type {object}
 * @property {string} address スタイルを省いた話者の指定（`voicevox:ずんだもん` など）
 * @property {?string} name 指定に使う名前と元の名前が違うときの元の名前（`小夜/SAYO` など。同じなら null）
 * @property {Array<string>} styles スタイル名
 * @property {boolean} available 音声エンジンが動いていて読み上げに使えるか
 */

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
     * ページ送りのディスクリプタ
     *
     * @type {string}
     */
    static get descriptor() {
        return 'speakers';
    }

    /**
     * @param {object} data
     * @param {Array<VoiceCharacter>} data.characters キャラ
     * @param {Array<NamedVoice>} data.named 別名・プリセット
     */
    constructor(data) {
        assert(Array.isArray(data.characters));
        assert(data.characters.every((c) => typeof c.address === 'string' && Array.isArray(c.styles)));
        assert(Array.isArray(data.named));
        assert(data.named.every((n) => typeof n.name === 'string' && typeof n.target === 'string'));

        Object.defineProperty(this, 'data', {
            value: { characters: data.characters.slice(), named: data.named.slice() },
            writable: false,
            enumerable: true,
            configurable: false,
        });
    }

    /**
     * キャラ
     *
     * @type {Array<VoiceCharacter>}
     */
    get characters() {
        return this.data.characters.slice();
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
     * ページ送りの行。キャラごとに1行、最後に別名・プリセットを並べる
     * エンジンが止まっているキャラには停止中と書く（設定済みの声が消えたように見えないよう、一覧からは外さない）
     *
     * @type {Array<{line: string}>}
     */
    get lines() {
        const characterLines = this.data.characters.map(({ address, name, styles, available }) => {
            const original = name ? `（${name}）` : '';
            const styleList = styles.length > 0 ? ` ${styles.join(' / ')}` : '';
            const stopped = available === false ? ' （停止中）' : '';
            return { line: `\`${address}\`${original}${styleList}${stopped}` };
        });
        const namedLines = this.data.named.map((n) => ({ line: `\`${n.name}\` → ${n.target}` }));
        return [...characterLines, ...namedLines];
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
        return VoiceCatalog.descriptor;
    }

    toString() {
        return `VoiceCatalog(characters=${this.data.characters.length}, named=${this.data.named.length})`;
    }
}

module.exports = VoiceCatalog;

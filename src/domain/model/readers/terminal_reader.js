const VoiceroidAudio = require('../../entity/audios/voiceroid_audio');
const Noop = require('../../entity/audios/noop');

/** @typedef {import('../../model/hanako')} Hanako */
/** @typedef {import('../../entity/audios').InternalAudioT} InternalAudioT */
/** @typedef {import('../../entity/audios/plain')} Plain */

// VOICEROID共通 無音文字の定義
const silentWordReg = new RegExp('[\\s　,.?!^()`:\'"`;{}\\[\\]_。、，．‥・…！？＿]+', 'g');

// VOICEROID共通 正しく読めない文字の定義
const brokenWordMap = (() => {
    const map = new Map();
    map.set('=', 'イコール');
    map.set('-', 'マイナス');
    map.set('\\*', 'アスタリスク');
    map.set('%', 'パーセント');
    map.set('@', 'アットマーク');
    map.set('#', 'シャープ');
    map.set('\\$', 'ドル');
    map.set('<', '小なり');
    map.set('>', '大なり');
    map.set('/', 'スラッシュ');
    map.set('\\\\', 'バクスラ');
    map.set('\\(', 'かっこ');
    map.set('\\)', '');
    map.set('（', 'かっこ');
    map.set('）', '');
    map.set('～', 'ー');
    const rMap = new Map();
    for (const [k, v] of map) {
        rMap.set(new RegExp(k, 'g'), v);
    }
    return rMap;
})();

/**
 * 未変換テキストをVOICEROID読み上げ手続きに変換
 *
 * @param {Hanako} hanako 読み上げ実行下の読み上げ花子モデル
 * @param {Plain} plain 未変換テキストエンティティ
 * @returns {VoiceroidAudio|Noop}
 */
function convert(hanako, plain) {
    let content = plain.content;
    if (content.length > 0) {
        for (const [k, v] of brokenWordMap) {
            content = content.replace(k, v);
        }
        const toRead = content.replace(silentWordReg, '');
        if (toRead.length === 0) {
            return new Noop();
        } else if (toRead.length / content.length < 0.51) {
            // 無音文字が占める割合が50%以上ならすべて削除する
            return new VoiceroidAudio({ content: toRead, speaker: hanako.settings.speaker });
        } else {
            return new VoiceroidAudio({ content, speaker: hanako.settings.speaker });
        }
    } else {
        return new Noop();
    }
}

/**
 * ドメインモデル
 * 終端Reader 適用後にPlainを残してはならない
 * 残ったPlainをすべてVOICEROID読み上げに変換して返す
 */
class TerminalReader {
    /**
     * @type {'terminal'}
     */
    get type() {
        return 'terminal';
    }

    /**
     * @param {Hanako} hanako 読み上げ実行下の読み上げ花子モデル
     */
    constructor(hanako) {
        this.hanako = hanako;
    }

    /**
     * 読み上げ（音声変換手続きの構築）処理
     *
     * @param {InternalAudioT} value 入力エンティティ
     * @returns {Array<InternalAudioT>} 構築結果 Audioエンティティの配列
     */
    read(value) {
        if (value.type === 'plain') {
            return [convert(this.hanako, value)];
        } else {
            return [value];
        }
    }
}

module.exports = TerminalReader;

const VoiceroidAudio = require('../../entities/audios/voiceroid_audio');
const Noop = require('../../entities/audios/noop');

/** @typedef {import('../../entities/audios/_audio').InternalAudioT} InternalAudioT */
/** @typedef {import('../../entities/audios/plain')} Plain */

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
 * @param {Plain} plain 未変換テキストエンティティ
 * @returns {VoiceroidAudio|Noop}
 */
function convert(plain) {
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
            return new VoiceroidAudio({ content: toRead });
        } else {
            return new VoiceroidAudio({ content });
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
     * 読み上げ（音声変換手続きの構築）処理
     *
     * @param {InternalAudioT} value 入力エンティティ
     * @returns {Array<InternalAudioT>} 構築結果 Audioエンティティの配列
     */
    read(value) {
        switch (value.type) {
            case 'plain':
                return [convert(value)];
            default:
                return [value];
        }
    }
}

module.exports = TerminalReader;

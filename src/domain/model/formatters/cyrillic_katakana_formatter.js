const assert = require('assert').strict;
const utils = require('../../../core/utils');

/** @typedef {import('../../model/hanako')} Hanako */

// 子音テーブル: [ア行, エ行, イ行, オ行, ウ行], デフォルト
const CONSONANTS = {
    б: { syl: ['バ', 'ベ', 'ビ', 'ボ', 'ブ'], def: 'ブ' },
    в: { syl: ['ヴァ', 'ヴェ', 'ヴィ', 'ヴォ', 'ヴ'], def: 'ヴ' },
    г: { syl: ['ガ', 'ゲ', 'ギ', 'ゴ', 'グ'], def: 'グ' },
    д: { syl: ['ダ', 'デ', 'ディ', 'ド', 'ドゥ'], def: 'ド' },
    ж: { syl: ['ジャ', 'ジェ', 'ジ', 'ジョ', 'ジュ'], def: 'ジュ' },
    з: { syl: ['ザ', 'ゼ', 'ジ', 'ゾ', 'ズ'], def: 'ズ' },
    к: { syl: ['カ', 'ケ', 'キ', 'コ', 'ク'], def: 'ク' },
    л: { syl: ['ラ', 'レ', 'リ', 'ロ', 'ル'], def: 'ル' },
    м: { syl: ['マ', 'メ', 'ミ', 'モ', 'ム'], def: 'ム' },
    н: { syl: ['ナ', 'ネ', 'ニ', 'ノ', 'ヌ'], def: 'ン' },
    п: { syl: ['パ', 'ペ', 'ピ', 'ポ', 'プ'], def: 'プ' },
    р: { syl: ['ラ', 'レ', 'リ', 'ロ', 'ル'], def: 'ル' },
    с: { syl: ['サ', 'セ', 'シ', 'ソ', 'ス'], def: 'ス' },
    т: { syl: ['タ', 'テ', 'ティ', 'ト', 'トゥ'], def: 'ト' },
    ф: { syl: ['ファ', 'フェ', 'フィ', 'フォ', 'フ'], def: 'フ' },
    х: { syl: ['ハ', 'ヘ', 'ヒ', 'ホ', 'フ'], def: 'フ' },
    ц: { syl: ['ツァ', 'ツェ', 'ツィ', 'ツォ', 'ツ'], def: 'ツ' },
    ч: { syl: ['チャ', 'チェ', 'チ', 'チョ', 'チュ'], def: 'チ' },
    ш: { syl: ['シャ', 'シェ', 'シ', 'ショ', 'シュ'], def: 'シュ' },
    щ: { syl: ['シチャ', 'シチェ', 'シチ', 'シチョ', 'シチュ'], def: 'シチ' },
};

// 母音インデックス: ア行=0, エ行=1, イ行=2, オ行=3, ウ行=4
const VOWEL_INDEX = {
    а: 0,
    я: 0,
    э: 1,
    е: 1,
    и: 2,
    о: 3,
    ё: 3,
    у: 4,
    ю: 4,
};

// 独立母音 (語頭・母音後)
const STANDALONE_VOWELS = {
    а: 'ア',
    э: 'エ',
    и: 'イ',
    о: 'オ',
    у: 'ウ',
    ы: 'ウイ',
    е: 'イェ',
    ё: 'ヨ',
    ю: 'ユ',
    я: 'ヤ',
};

/**
 * キリル文字列をカタカナに音写する
 *
 * @param {string} cyrillicWord キリル文字の連続
 * @returns {string} カタカナ文字列
 */
function transliterate(cyrillicWord) {
    const input = cyrillicWord.toLowerCase();
    const result = [];
    let pending = null; // 保留中の子音エントリ

    for (let i = 0; i < input.length; i++) {
        const ch = input[i];

        if (ch === 'й') {
            // й: 保留子音をフラッシュしてイを出力
            if (pending) {
                result.push(pending.def);
                pending = null;
            }
            result.push('イ');
        } else if (ch === 'ь') {
            // 軟音記号: 保留子音をイ行(口蓋化)で出力
            if (pending) {
                result.push(pending.syl[2]); // イ行 = index 2
                pending = null;
            }
        } else if (ch === 'ъ') {
            // 硬音記号: 保留子音をデフォルトでフラッシュ
            if (pending) {
                result.push(pending.def);
                pending = null;
            }
        } else if (ch === 'ы') {
            // ы: 保留子音をデフォルトでフラッシュ + ウイ
            if (pending) {
                result.push(pending.def);
                pending = null;
            }
            result.push('ウイ');
        } else if (CONSONANTS[ch]) {
            // 子音: 保留をフラッシュして新しい子音を保留
            if (pending) {
                result.push(pending.def);
            }
            pending = CONSONANTS[ch];
        } else if (VOWEL_INDEX[ch] !== undefined) {
            // 母音 (а, е, ё, э, и, о, у, ю, я)
            if (pending) {
                result.push(pending.syl[VOWEL_INDEX[ch]]);
                pending = null;
            } else {
                result.push(STANDALONE_VOWELS[ch]);
            }
        } else {
            // 未知の文字: 保留をフラッシュしてそのまま出力
            if (pending) {
                result.push(pending.def);
                pending = null;
            }
            result.push(ch);
        }
    }

    // 末尾の保留子音をフラッシュ
    if (pending) {
        result.push(pending.def);
    }

    return result.join('');
}

/**
 * ドメインモデル
 * キリル文字カタカナ変換フォーマッター
 */
class CyrillicKatakanaFormatter {
    /**
     * @returns {'cyrillic_katakana'}
     */
    get type() {
        return 'cyrillic_katakana';
    }

    /**
     * キリル文字(ロシア語)をカタカナに音訳する
     *
     * @param {string} text 入力文字列
     * @returns {string} 出力文字列
     */
    format(text) {
        assert(typeof text === 'string');

        // 空文字列はフォーマット処理しない
        if (utils.countUnicode(text) === 0) {
            return '';
        }

        // キリル文字の連続をカタカナに置換
        return text.replace(/[а-яА-ЯёЁ]+/g, (match) => transliterate(match));
    }
}

module.exports = CyrillicKatakanaFormatter;

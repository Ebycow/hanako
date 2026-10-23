const assert = require('assert').strict;

/**
 * mp4 系（ISO BMFF）の主ブランドのうち、音声として受け付けるもの
 *
 * 音声専用のブランド（M4A など）に加えて、音声だけの mp4 でも使われる汎用ブランドも受け付ける。
 * 汎用ブランドは動画にも使われるが、動画なら FFmpeg が音声トラックだけを変換し、
 * 音声トラックがなければ変換結果が空になって登録されない。
 * 同じ形式の画像（avif・heic・mif1 など）は受け付けない。
 */
const MP4_AUDIO_BRANDS = new Set(['M4A ', 'M4B ', 'M4P ', 'F4A ', 'F4B ', 'isom', 'iso2', 'mp41', 'mp42', 'dash']);

/**
 * offset の位置から始まるデータの形式を判定する
 *
 * @param {Buffer} buffer
 * @param {number} offset
 * @returns {?string}
 */
function detectAt(buffer, offset) {
    const has = (signature, at = 0) => {
        const start = offset + at;
        return buffer.toString('latin1', start, start + signature.length) === signature;
    };

    // ID3タグ: タグを読み飛ばした先で判定し、わからなければ mp3 とみなす
    if (has('ID3') && buffer.length >= offset + 10) {
        const size =
            ((buffer[offset + 6] & 0x7f) << 21) |
            ((buffer[offset + 7] & 0x7f) << 14) |
            ((buffer[offset + 8] & 0x7f) << 7) |
            (buffer[offset + 9] & 0x7f);
        const footer = buffer[offset + 5] & 0x10 ? 10 : 0;
        return detectAt(buffer, offset + 10 + size + footer) || 'mp3';
    }
    if (has('fLaC')) return 'flac';
    if (has('RIFF') && has('WAVE', 8)) return 'wav';
    if (has('FORM') && (has('AIFF', 8) || has('AIFC', 8))) return 'aiff';
    if (has('#!AMR')) return 'amr';
    if (has('OggS')) {
        // 最初のパケットが Theora なら動画
        return buffer[offset + 28] === 0x80 && has('theora', 29) ? null : 'ogg';
    }
    if (has('ftyp', 4)) {
        return MP4_AUDIO_BRANDS.has(buffer.toString('latin1', offset + 8, offset + 12)) ? 'm4a' : null;
    }

    // フレーム同期（先頭11ビットが1）で始まる MPEG オーディオ
    if (buffer.length >= offset + 2 && buffer[offset] === 0xff && (buffer[offset + 1] & 0xe0) === 0xe0) {
        const second = buffer[offset + 1];
        const version = (second >> 3) & 0b11;
        const layer = (second >> 1) & 0b11;
        // レイヤーが 00 なら AAC（ADTS）
        if ((second & 0xf6) === 0xf0) return 'aac';
        // バージョン 01・レイヤー 00 は予約値
        if (version !== 0b01 && layer !== 0b00) return 'mp3';
    }

    return null;
}

/**
 * データの先頭のシグネチャから音声ファイルの形式を判定する
 *
 * 対応形式: mp3（MPEG オーディオ）・aac（ADTS）・wav・flac・ogg（Vorbis・Opus など）・m4a・aiff・amr
 * 判定はシグネチャを見るだけなので、中身が壊れていないことまでは保証しない
 * （変換できない音声は FFmpeg の段階で弾く）。
 *
 * @param {Buffer} buffer ファイルの内容
 * @returns {?string} 音声ファイルなら形式名、そうでなければ null
 */
function detectAudioFormat(buffer) {
    assert(Buffer.isBuffer(buffer));

    return detectAt(buffer, 0);
}

module.exports = detectAudioFormat;

const should = require('chai').should();
const detectAudioFormat = require('../../src/library/detect_audio_format');

/************************************************************************
 * detectAudioFormat関数単体スペック
 *
 * 期待動作：データ先頭のシグネチャから音声ファイルの形式名を返し、音声でなければ null を返す
 * 備考：なし
 ***********************************************************************/

/**
 * 文字列（latin1）とバイト列を連結したバッファを作る
 *
 * @param {...(string|number[])} parts
 * @returns {Buffer}
 */
function bytes(...parts) {
    return Buffer.concat(
        parts.map((part) => (typeof part === 'string' ? Buffer.from(part, 'latin1') : Buffer.from(part)))
    );
}

/** ID3v2 タグヘッダ（本体 size バイト） */
function id3(size, flags = 0) {
    return bytes('ID3', [0x04, 0x00, flags, 0x00, 0x00, (size >> 7) & 0x7f, size & 0x7f]);
}

/** mp4 系ファイルの先頭（ftyp ボックス） */
function ftyp(brand) {
    return bytes([0x00, 0x00, 0x00, 0x20], 'ftyp', brand, [0x00, 0x00, 0x02, 0x00]);
}

/** Ogg の最初のページ（最初のパケットが packet で始まる） */
function ogg(packet) {
    return bytes('OggS', Buffer.alloc(24), packet);
}

const MP3_FRAME = [0xff, 0xfb, 0x90, 0x00];

describe('detectAudioFormat', () => {
    context('音声ファイル', () => {
        specify('MPEG オーディオのフレームで始まる → mp3', () => {
            detectAudioFormat(bytes(MP3_FRAME, 'data')).should.equal('mp3');
        });

        specify('ID3タグで始まる → mp3', () => {
            detectAudioFormat(bytes(id3(4), 'xxxx', MP3_FRAME)).should.equal('mp3');
        });

        specify('ID3タグの後が別の形式ならその形式', () => {
            detectAudioFormat(bytes(id3(4), 'xxxx', 'fLaC')).should.equal('flac');
        });

        specify('ID3タグのフッタも読み飛ばす', () => {
            detectAudioFormat(bytes(id3(4, 0x10), 'xxxx', '3DI', Buffer.alloc(7), 'fLaC')).should.equal('flac');
        });

        specify('ID3タグだけ → mp3', () => {
            detectAudioFormat(id3(0)).should.equal('mp3');
        });

        specify('ADTS ヘッダ → aac', () => {
            detectAudioFormat(bytes([0xff, 0xf1, 0x50, 0x80])).should.equal('aac');
        });

        specify('RIFF/WAVE → wav', () => {
            detectAudioFormat(bytes('RIFF', [0x24, 0, 0, 0], 'WAVEfmt ')).should.equal('wav');
        });

        specify('fLaC → flac', () => {
            detectAudioFormat(bytes('fLaC', [0x00])).should.equal('flac');
        });

        specify('Ogg Vorbis・Opus → ogg', () => {
            detectAudioFormat(ogg(bytes([0x01], 'vorbis'))).should.equal('ogg');
            detectAudioFormat(ogg(bytes('OpusHead'))).should.equal('ogg');
        });

        specify('音声のブランドの mp4 → m4a', () => {
            detectAudioFormat(ftyp('M4A ')).should.equal('m4a');
        });

        specify('汎用ブランドの mp4 → m4a（音声トラックの有無は FFmpeg に任せる）', () => {
            detectAudioFormat(ftyp('isom')).should.equal('m4a');
            detectAudioFormat(ftyp('mp42')).should.equal('m4a');
        });

        specify('AIFF・AIFC → aiff', () => {
            detectAudioFormat(bytes('FORM', [0, 0, 0, 0], 'AIFF')).should.equal('aiff');
            detectAudioFormat(bytes('FORM', [0, 0, 0, 0], 'AIFC')).should.equal('aiff');
        });

        specify('#!AMR → amr', () => {
            detectAudioFormat(bytes('#!AMR\n')).should.equal('amr');
        });
    });

    context('音声以外', () => {
        specify('空のデータ → null', () => {
            should.equal(detectAudioFormat(Buffer.alloc(0)), null);
        });

        specify('テキスト → null', () => {
            should.equal(detectAudioFormat(Buffer.from('<!DOCTYPE html>')), null);
        });

        specify('PNG → null', () => {
            should.equal(detectAudioFormat(bytes([0x89], 'PNG', [0x0d, 0x0a, 0x1a, 0x0a])), null);
        });

        specify('RIFF でも WAVE でなければ（WebP・AVI）→ null', () => {
            should.equal(detectAudioFormat(bytes('RIFF', [0, 0, 0, 0], 'WEBPVP8 ')), null);
            should.equal(detectAudioFormat(bytes('RIFF', [0, 0, 0, 0], 'AVI LIST')), null);
        });

        specify('Ogg Theora（動画）→ null', () => {
            should.equal(detectAudioFormat(ogg(bytes([0x80], 'theora'))), null);
        });

        specify('画像のブランドの mp4 系（AVIF・HEIC）→ null', () => {
            should.equal(detectAudioFormat(ftyp('avif')), null);
            should.equal(detectAudioFormat(ftyp('heic')), null);
        });

        specify('フレーム同期に見えても予約値なら → null', () => {
            // バージョン 01（予約値）
            should.equal(detectAudioFormat(bytes([0xff, 0xeb])), null);
            // レイヤー 00 で ADTS でもない（MPEG-2.5）
            should.equal(detectAudioFormat(bytes([0xff, 0xe0])), null);
        });

        specify('Buffer 以外はエラー', () => {
            (() => detectAudioFormat('ID3')).should.throw();
        });
    });
});

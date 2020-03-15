const { EbyroidRequest, NoopRequest } = require('../domain/models/audiorequest');
const { RequestConverter } = require('./converter');

const silentWordReg = new RegExp('[\\s　,.?!^()`:\'"`;{}\\[\\]_。、，．‥・…！？＿]+', 'g');

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
    const rMap = new Map();
    for (const [k, v] of map) {
        rMap.set(new RegExp(k, 'g'), v);
    }
    return rMap;
})();

/**
 * @param {string|AudioRequest} value
 * @returns {AudioRequest}
 */
function ebyroidF(value) {
    if (typeof value === 'string') {
        if (value.length > 0) {
            for (const [k, v] of brokenWordMap) {
                value = value.replace(k, v);
            }
            const toRead = value.replace(silentWordReg, '');
            if (toRead.length === 0) {
                return new NoopRequest();
            } else if (toRead.length / value.length < 0.51) {
                // 無音文字が占める割合が50%以上ならすべて削除する
                return new EbyroidRequest(toRead);
            } else {
                return new EbyroidRequest(value);
            }
        } else {
            return new NoopRequest();
        }
    } else {
        return value;
    }
}

/**
 * 最後まで変換されなかったテキストをオーディオリクエストにするコンバーター
 */
class TextConverter extends RequestConverter {
    /**
     * @param {MessageContext} context
     * @param {Array<string|AudioRequest>} array
     * @returns {Array<AudioRequest>}
     * @override
     */
    convert(context, array) {
        // SE置換などの処理で置換されなかった普通のテキストを処理する
        // 将来的には context で設定を読んで ebyroid 以外に音声リクエストにするような処理も考えゆ
        return array.map(ebyroidF);
    }

    /**
     * @returns {number}
     * @override
     */
    convertPriority() {
        // 必ず一番最後に実行する
        return 0xffff;
    }
}

module.exports = {
    TextConverter,
};

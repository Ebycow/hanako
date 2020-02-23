const { MessageContext } = require('../contexts/messagecontext');
const { AudioRequest, EbyroidRequest } = require('../models/audiorequest');
const { RequestConverter } = require('./converter');

/**
 * @param {string|AudioRequest} value
 * @returns {AudioRequest}
 */
function ebyroidF(value) {
    if (typeof value === 'string') {
        return new EbyroidRequest(value);
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
        return 0xFFFF;
    }

}

module.exports = {
    TextConverter
};

const assert = require('assert').strict;
const emojiData = require('emojibase-data/ja/compact.json');

const tagRe = /<(a?:.+?:\d+)?(@!?\d+)?(#\d+)?(@!?&\d+)?>/g;
const emojiRe = /:(.+):/;
const unicodeEmojiRe = /\p{RGI_Emoji}/gv;

// 異体字セレクタを除去して、表示形式の違いを同一視する
const removeVariationSelectors = (text) => text.replace(/[︎️]/g, '');
// 肌の色の修飾子を除去して、肌の色違いを元の絵文字と同一視する
const removeSkinTones = (text) => text.replace(/[\u{1F3FB}-\u{1F3FF}]/gu, '');

// 絵文字 → Unicode公式(CLDR)の日本語名
const emojiNames = new Map(
    emojiData.map((e) => [removeVariationSelectors(e.unicode), e.label.replace(/\s*:\s*/g, ' ').trim()])
);

/**
 * @typedef NameResolvers
 * @type {object}
 *
 * @property {function(string): (string|undefined)} [user] ユーザーIDから表示名を引く
 * @property {function(string): (string|undefined)} [role] ロールIDからロール名を引く
 * @property {function(string): (string|undefined)} [channel] チャンネルIDからチャンネル名を引く
 */

/**
 * ディスコードの内部タグ表現を標準表示形式に置換
 *
 * @param {string} text
 * @param {NameResolvers} resolvers
 * @returns {string}
 */
function replaceDiscordTags(text, resolvers) {
    const resolve = (kind, id) => (resolvers[kind] ? resolvers[kind](id) : undefined);

    return text.replace(tagRe, (_, emojiTag, userTag, channelTag, roleTag) => {
        if (typeof emojiTag !== 'undefined') {
            const emojiName = emojiTag.match(emojiRe)[1];
            return ':' + emojiName + ':';
        }
        if (typeof userTag !== 'undefined') {
            const head = userTag.startsWith('@!') ? 2 : 1;
            const userId = userTag.slice(head);
            return '@' + (resolve('user', userId) || '誰ですか？');
        }
        if (typeof channelTag !== 'undefined') {
            const channelId = channelTag.slice(1);
            return '#' + (resolve('channel', channelId) || 'どこですか？');
        }
        if (typeof roleTag !== 'undefined') {
            const roleId = roleTag.slice(2);
            return '@' + (resolve('role', roleId) || '誰ですか？');
        }

        throw new Error('unreachable');
    });
}

/**
 * Unicodeコードポイントで表現される絵文字を":日本語名:"に変換
 * 肌の色の違いは読まず、元の絵文字と同じ名前にする
 *
 * @param {string} text
 * @returns {string}
 */
function replaceUnicodeEmojis(text) {
    return text.replace(unicodeEmojiRe, (emoji) => {
        const key = removeVariationSelectors(emoji);
        const name = emojiNames.get(key) || emojiNames.get(removeSkinTones(key));
        return name ? `:${name}:` : emoji;
    });
}

/**
 * Discordから受け取った文字列を花子が扱う標準形式にする
 * - メンション・チャンネル・ロールのタグを名前に置換
 * - カスタム絵文字を名前だけにする
 * - Unicode絵文字を日本語名にする
 *
 * メッセージ本文とスラッシュコマンドの引数の両方で同じ結果になるよう、この関数を共通で使う。
 *
 * @param {string} text 対象文字列
 * @param {NameResolvers} [resolvers={}] タグのIDから名前を引く関数
 * @returns {string} 標準化された文字列
 */
function sanitizeContent(text, resolvers = {}) {
    assert(typeof text === 'string');
    assert(typeof resolvers === 'object');

    return replaceUnicodeEmojis(replaceDiscordTags(text, resolvers));
}

module.exports = sanitizeContent;

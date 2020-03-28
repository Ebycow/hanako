const errors = require('../core/errors').promises;

/** @typedef {import('discord.js').MessageReaction} discord.MessageReaction */
/** @typedef {import('discord.js').User} discord.User */

const EMOJI_POINT_LEFT = new Uint8Array([0xf0, 0x9f, 0x91, 0x88]);
const EMOJI_POINT_RIGHT = new Uint8Array([0xf0, 0x9f, 0x91, 0x89]);

/**
 * ミドルウェア
 * ページングリアクションのみをフィルターする
 */
class PagerReactionFilterMiddleWare {
    /**
     * @param {discord.Client} client Discord Botのクライアント
     */
    constructor(client) {
        this.client = client;
    }

    /**
     * ミドルウェア変換
     * - ページングリアクションではないとき errors.abort
     *
     * @param {discord.MessageReaction} reaction 付与または削除されたリアクション
     * @param {discord.User} user リアクションを付与または削除したユーザー
     * @returns {Promise<[discord.MessageReaction, discord.User, ('forward'|'backward')]>} コントローラに渡す引数
     */
    async transform(reaction, user) {
        // 花子以外のメッセージへのリアクションは無視
        if (reaction.message.author.id !== this.client.user.id) {
            return errors.abort();
        }

        // 自分のリアクションは無視
        if (user.id === this.client.user.id) {
            return errors.abort();
        }

        // 花子起源のリアクションがちょうど2つのときのみ扱う
        const selfReactions = reaction.message.reactions.cache.filter(reaction => reaction.me);
        if (selfReactions.size !== 2) {
            return errors.abort();
        }

        // 絵文字をUTF-8のバイト表現に変換
        const emoji = Buffer.from(reaction.emoji.name, 'utf-8');

        if (emoji.equals(EMOJI_POINT_LEFT)) {
            // '👈' のとき 'backward'
            return Promise.resolve([reaction, user, 'backward']);
        } else if (emoji.equals(EMOJI_POINT_RIGHT)) {
            // '👉' のとき 'forward'
            return Promise.resolve([reaction, user, 'forward']);
        } else {
            // それ以外なら無視
            return errors.abort();
        }
    }
}

module.exports = PagerReactionFilterMiddleWare;

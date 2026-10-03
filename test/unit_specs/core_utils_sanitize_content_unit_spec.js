require('chai').should();
const sanitizeContent = require('../../src/core/utils/sanitize_content');

/************************************************************************
 * sanitizeContent関数単体スペック
 *
 * 期待動作：Discordのタグや絵文字を花子が扱う標準形式に置換する
 * 備考：絵文字の変換はMessageSanitizeMiddleWareのスペックでも確認している
 ***********************************************************************/

describe('sanitizeContent', () => {
    context('正常系', () => {
        specify('タグを含まないテキストはそのまま返す', () => {
            sanitizeContent('こんにちは花子').should.equal('こんにちは花子');
        });

        specify('カスタム絵文字は名前だけ残す', () => {
            sanitizeContent('<:donut:123456789>と<a:dance:987654321>').should.equal(':donut:と:dance:');
        });

        specify('Unicode絵文字を日本語名にする', () => {
            sanitizeContent('🍙').should.equal(':おにぎり:');
        });

        specify('リゾルバでユーザー・ロール・チャンネルの名前を引く', () => {
            const resolvers = {
                user: (id) => ({ 1: 'えびかう' })[id],
                role: (id) => ({ 2: '管理者' })[id],
                channel: (id) => ({ 3: '雑談' })[id],
            };
            sanitizeContent('<@1> <@!1> <@&2> <#3>', resolvers).should.equal('@えびかう @えびかう @管理者 #雑談');
        });

        specify('名前が引けないタグは分からないことを示す名前にする', () => {
            sanitizeContent('<@1> <@&2> <#3>').should.equal('@誰ですか？ @誰ですか？ #どこですか？');
        });
    });
});

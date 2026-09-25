require('chai').should();
const MessageSanitizeMiddleWare = require('../../src/app/message_sanitize_middle_ware');

describe('MessageSanitizeMiddleWare', () => {
    const middleware = new MessageSanitizeMiddleWare();

    function createMessage(content) {
        return {
            content,
            mentions: { roles: [], channels: [], members: [] },
            stickers: new Map(),
        };
    }

    async function sanitize(content) {
        const [, text] = await middleware.transform(createMessage(content));
        return text;
    }

    describe('Unicode絵文字', () => {
        it('公式の日本語名に変換する', async () => {
            (await sanitize('たまねぎ😂です')).should.equal('たまねぎ:嬉し泣き:です');
            (await sanitize('🍙')).should.equal(':おにぎり:');
        });

        it('異体字セレクタの有無に関わらず変換する', async () => {
            (await sanitize('❤️')).should.equal(':赤いハート:');
        });

        it('肌の色違いは元の絵文字と同じ名前にする', async () => {
            (await sanitize('👍🏽')).should.equal(':サムズアップ:');
            (await sanitize('🙋🏻‍♀️')).should.equal(':手を挙げる女:');
        });

        it('肌の色の修飾子単体はその名前で変換する', async () => {
            (await sanitize('🏽')).should.equal(':中間の肌色:');
        });

        it('ZWJで結合された絵文字を1つの絵文字として変換する', async () => {
            (await sanitize('🧑‍💻')).should.equal(':技術者:');
            (await sanitize('🐦‍🔥')).should.equal(':フェニックス:');
        });

        it('名前に含まれるコロンは空白に置き換える', async () => {
            (await sanitize('🇯🇵')).should.equal(':旗 日本:');
        });

        it('比較的新しい絵文字も変換する', async () => {
            (await sanitize('🫠🩷')).should.equal(':溶けている顔::ピンクのハート:');
        });

        it('絵文字でない文字は変換しない', async () => {
            (await sanitize('ABC123 #テスト ©')).should.equal('ABC123 #テスト ©');
        });
    });

    describe('Discordタグ', () => {
        it('カスタム絵文字は名前だけ残す', async () => {
            (await sanitize('<:donut:123456789>')).should.equal(':donut:');
        });
    });
});

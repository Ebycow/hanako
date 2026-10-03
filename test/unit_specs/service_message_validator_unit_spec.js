const should = require('chai').should();
const { ChannelType } = require('discord.js');
const MessageValidator = require('../../src/service/message_validator');
const EbyAbortError = require('../../src/core/errors/eby_abort_error');

/************************************************************************
 * MessageValidatorクラス単体スペック
 *
 * メソッド：#validate
 * 期待動作：処理対象のメッセージのみ通し、それ以外は abort する
 * 備考：なし
 ***********************************************************************/

/**
 * @param {object} overrides
 * @returns {object} バリデーションデータ
 */
function validatorData(overrides = {}) {
    return Object.assign(
        { isBot: false, content: 'こんにちは', userName: 'mock-user', channelType: ChannelType.GuildText },
        overrides
    );
}

/**
 * @param {object} data
 */
async function shouldAbort(data) {
    try {
        await new MessageValidator().validate(data);
        should.fail('should have rejected');
    } catch (e) {
        e.should.be.instanceOf(EbyAbortError);
    }
}

describe('MessageValidator', () => {
    describe('#validate', () => {
        context('正常系', () => {
            specify('テキストチャンネルの通常メッセージは通す', async () => {
                await new MessageValidator().validate(validatorData());
            });

            specify('ボイスチャンネルのチャットは通す', async () => {
                await new MessageValidator().validate(validatorData({ channelType: ChannelType.GuildVoice }));
            });
        });

        context('異常系', () => {
            specify('Botのメッセージはabortする', async () => {
                await shouldAbort(validatorData({ isBot: true }));
            });

            specify('空のメッセージはabortする', async () => {
                await shouldAbort(validatorData({ content: '' }));
            });

            specify('DMはabortする', async () => {
                await shouldAbort(validatorData({ channelType: ChannelType.DM }));
            });

            for (const [name, type] of [
                ['スレッド', ChannelType.PublicThread],
                ['プライベートスレッド', ChannelType.PrivateThread],
                ['アナウンス', ChannelType.GuildAnnouncement],
                ['ステージ', ChannelType.GuildStageVoice],
            ]) {
                specify(`${name}のメッセージはAssertionErrorにせずabortする`, async () => {
                    await shouldAbort(validatorData({ channelType: type }));
                });
            }
        });
    });
});

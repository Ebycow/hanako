const should = require('chai').should();
const ActionResponse = require('../../src/domain/entity/responses/action_response');
const ChatResponse = require('../../src/domain/entity/responses/chat_response');
const SilentResponse = require('../../src/domain/entity/responses/silent_response');

/************************************************************************
 * ActionResponseエンティティ単体スペック
 *
 * 期待動作：アクション実行レスポンスとして機能する
 * 備考：なし
 ***********************************************************************/

describe('ActionResponse', () => {
    describe('構築', () => {
        specify('onSuccess/onFailureを指定して構築できる', () => {
            const onSuccess = new ChatResponse({ id: 'id', content: '成功', channelId: 'ch', code: 'simple' });
            const onFailure = new ChatResponse({ id: 'id', content: '失敗', channelId: 'ch', code: 'error' });
            const res = new ActionResponse({
                id: 'test-id',
                action: { type: 'join_voice' },
                onSuccess,
                onFailure,
            });
            res.should.be.an.instanceOf(ActionResponse);
            res.onSuccess.should.equal(onSuccess);
            res.onFailure.should.equal(onFailure);
        });

        specify('onSuccess省略時はSilentResponseになる', () => {
            const res = new ActionResponse({
                id: 'test-id',
                action: { type: 'join_voice' },
            });
            res.onSuccess.should.be.an.instanceOf(SilentResponse);
        });

        specify('onFailure省略時はSilentResponseになる', () => {
            const res = new ActionResponse({
                id: 'test-id',
                action: { type: 'join_voice' },
            });
            res.onFailure.should.be.an.instanceOf(SilentResponse);
        });
    });

    describe('ゲッター', () => {
        specify('typeはactionを返す', () => {
            const res = new ActionResponse({ id: 'id', action: { type: 'test' } });
            res.type.should.equal('action');
        });

        specify('idを返す', () => {
            const res = new ActionResponse({ id: 'test-id', action: { type: 'test' } });
            res.id.should.equal('test-id');
        });

        specify('actionを返す', () => {
            const action = { type: 'join_voice', serverId: 'srv' };
            const res = new ActionResponse({ id: 'id', action });
            res.action.type.should.equal('join_voice');
        });
    });

    describe('#toString', () => {
        specify('文字列表現を返す', () => {
            const res = new ActionResponse({ id: 'id', action: { type: 'test' } });
            res.toString().should.be.a('string');
        });
    });
});

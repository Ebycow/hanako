const should = require('chai').should();
const ChatResponse = require('../../src/domain/entity/responses/chat_response');
const EbyAbortError = require('../../src/core/errors/eby_abort_error');

/************************************************************************
 * ChatResponseエンティティ単体スペック
 *
 * 期待動作：会話レスポンスとして機能する
 * 備考：なし
 ***********************************************************************/

describe('ChatResponse', () => {
    describe('構築', () => {
        specify('正しいデータで構築できる', () => {
            const res = new ChatResponse({
                id: 'test-id',
                content: 'テスト',
                channelId: 'ch-001',
                code: 'simple',
            });
            res.should.be.an.instanceOf(ChatResponse);
        });
    });

    describe('ゲッター', () => {
        specify('typeはchatを返す', () => {
            const res = new ChatResponse({ id: 'id', content: 'test', channelId: 'ch', code: 'simple' });
            res.type.should.equal('chat');
        });

        specify('idを返す', () => {
            const res = new ChatResponse({ id: 'test-id', content: 'test', channelId: 'ch', code: 'simple' });
            res.id.should.equal('test-id');
        });

        specify('contentを返す', () => {
            const res = new ChatResponse({ id: 'id', content: 'テスト内容', channelId: 'ch', code: 'simple' });
            res.content.should.equal('テスト内容');
        });

        specify('codeを返す', () => {
            const res = new ChatResponse({ id: 'id', content: 'test', channelId: 'ch', code: 'error' });
            res.code.should.equal('error');
        });

        specify('channelIdを返す', () => {
            const res = new ChatResponse({ id: 'id', content: 'test', channelId: 'ch-001', code: 'simple' });
            res.channelId.should.equal('ch-001');
        });
    });

    describe('#withError', () => {
        specify('codeがerrorのときebyエラーの情報を結合する', () => {
            const res = new ChatResponse({ id: 'id', content: '元のメッセージ', channelId: 'ch', code: 'error' });
            const err = new EbyAbortError('テスト理由');
            const result = res.withError(err);
            result.content.should.include('元のメッセージ');
            result.content.should.include(err.message);
            result.code.should.equal('error');
        });

        specify('codeがerror以外のときは自身を返す', () => {
            const res = new ChatResponse({ id: 'id', content: 'テスト', channelId: 'ch', code: 'simple' });
            const err = new EbyAbortError('テスト理由');
            const result = res.withError(err);
            result.should.equal(res);
        });

        specify('ebyプロパティがないエラーのときは自身を返す', () => {
            const res = new ChatResponse({ id: 'id', content: 'テスト', channelId: 'ch', code: 'error' });
            const err = new Error('通常エラー');
            const result = res.withError(err);
            result.should.equal(res);
        });
    });

    describe('#toString', () => {
        specify('文字列表現を返す', () => {
            const res = new ChatResponse({ id: 'id', content: 'テスト', channelId: 'ch', code: 'simple' });
            res.toString().should.be.a('string');
            res.toString().should.include('id');
        });
    });
});

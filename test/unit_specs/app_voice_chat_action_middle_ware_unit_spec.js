require('chai').should();
const VoiceChatActionMiddleWare = require('../../src/app/voice_chat_action_middle_ware');

describe('VoiceChatActionMiddleWare', () => {
    const HANAKO_ID = 'hanako';
    const middleware = new VoiceChatActionMiddleWare({ user: { id: HANAKO_ID } });

    function channel(id, memberIds) {
        return { id, members: memberIds.map((memberId) => ({ id: memberId })) };
    }

    function state(ch, memberId = 'user') {
        return { channel: ch, channelId: ch ? ch.id : null, member: { id: memberId } };
    }

    async function shouldAbort(promise) {
        try {
            await promise;
        } catch (e) {
            e.type.should.equal('abort');
            return;
        }
        throw new Error('abortされなかった');
    }

    it('花子のいるVCから切断したら退出イベントにする', async () => {
        const vc = channel('vc-1', [HANAKO_ID]);
        const [ch, , action] = await middleware.transform(state(vc), state(null));
        ch.should.equal(vc);
        action.should.equal('left');
    });

    it('花子のいるVCへ参加したら参加イベントにする', async () => {
        const vc = channel('vc-1', [HANAKO_ID, 'user']);
        const [ch, , action] = await middleware.transform(state(null), state(vc));
        ch.should.equal(vc);
        action.should.equal('joined');
    });

    it('花子のいるVCから別のVCへ移動したら退出イベントにする', async () => {
        const from = channel('vc-1', [HANAKO_ID]);
        const to = channel('vc-2', ['user']);
        const [ch, , action] = await middleware.transform(state(from), state(to));
        ch.should.equal(from);
        action.should.equal('left');
    });

    it('別のVCから花子のいるVCへ移動したら参加イベントにする', async () => {
        const from = channel('vc-1', []);
        const to = channel('vc-2', [HANAKO_ID, 'user']);
        const [ch, , action] = await middleware.transform(state(from), state(to));
        ch.should.equal(to);
        action.should.equal('joined');
    });

    it('同じVC内の状態変化は無視する', async () => {
        const vc = channel('vc-1', [HANAKO_ID, 'user']);
        await shouldAbort(middleware.transform(state(vc), state(vc)));
    });

    it('花子のいないVC間の移動は無視する', async () => {
        await shouldAbort(middleware.transform(state(channel('vc-1', [])), state(channel('vc-2', ['user']))));
    });

    it('花子自身のイベントは無視する', async () => {
        const from = channel('vc-1', []);
        const to = channel('vc-2', [HANAKO_ID]);
        await shouldAbort(middleware.transform(state(from, HANAKO_ID), state(to, HANAKO_ID)));
    });
});

const assert = require('assert').strict;
const Injector = require('../../core/injector');
const IDiscordVcActionRepo = require('../repo/i_discord_vc_action_repo');
const IWordActionRepo = require('../repo/i_word_action_repo');
const ISettingsActionRepo = require('../repo/i_settings_action_repo');

/** @typedef {import('../entity/actions').ActionT} ActionT */

/**
 * ドメインサービス
 * アクションエンティティのハンドラ
 */
class ActionHandler {
    /**
     * @param {null} vcActionRepo DI
     * @param {null} wordActionRepo DI
     * @param {null} settingsActionRepo DI
     */
    constructor(vcActionRepo = null, wordActionRepo = null, settingsActionRepo = null) {
        this.vcActionRepo = vcActionRepo || Injector.resolve(IDiscordVcActionRepo);
        this.wordActionRepo = wordActionRepo || Injector.resolve(IWordActionRepo);
        this.settingsActionRepo = settingsActionRepo || Injector.resolve(ISettingsActionRepo);
    }

    /**
     * アクションエンティティを処理
     *
     * @param {ActionT} action アクションエンティティ
     * @returns {Promise<void>}
     */
    async handle(action) {
        assert(typeof action === 'object');

        // アクションタイプによって対応するリポジトリに振り分け
        const type = action.type;
        if (type === 'join_voice') {
            return this.vcActionRepo.postJoinVoice(action);
        } else if (type === 'leave_voice') {
            return this.vcActionRepo.postLeaveVoice(action);
        } else if (type === 'seibai') {
            return this.vcActionRepo.postSeibai(action);
        } else if (type === 'word_create') {
            return this.wordActionRepo.postWordCreate(action);
        } else if (type === 'word_delete') {
            return this.wordActionRepo.postWordDelete(action);
        } else if (type === 'word_clear') {
            return this.wordActionRepo.postWordClear(action);
        } else if (type === 'max_count_update') {
            return this.settingsActionRepo.postMaxCountUpdate(action);
        } else {
            throw new Error('unreachable');
        }
    }
}

module.exports = ActionHandler;

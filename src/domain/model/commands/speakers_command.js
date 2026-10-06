const path = require('path');
const logger = require('log4js').getLogger(path.basename(__filename));
const assert = require('assert').strict;
const Pager = require('../pager');
const VoiceCatalogLoadAction = require('../../entity/actions/voice_catalog_load_action');
const ActionResponse = require('../../entity/responses/action_response');

/** @typedef {import('./index').SlashCommandDefinition} SlashCommandDefinition */
/** @typedef {import('../../entity/command_input')} CommandInput */
/** @typedef {import('../../entity/responses').ResponseT} ResponseT */
/** @typedef {import('../hanako')} Hanako */
/** @typedef {import('../../entity/voice_catalog')} VoiceCatalog */

/**
 * ドメインモデル
 * 読み上げキャラクター一覧コマンド
 */
class SpeakersCommand {
    /**
     * @type {'speakers'}
     */
    get type() {
        return 'speakers';
    }

    /**
     * @type {string[]}
     */
    static get names() {
        return ['キャラクター一覧', 'speakers'];
    }

    /**
     * スラッシュコマンドの定義
     *
     * @type {SlashCommandDefinition}
     */
    static get slash() {
        return {
            name: 'speakers',
            description: '読み上げキャラクターの一覧を表示します',
            ephemeral: true,
            options: [],
        };
    }

    /**
     * @param {Hanako} hanako コマンド実行下の読み上げ花子
     */
    constructor(hanako) {
        this.hanako = hanako;
    }

    /**
     * キャラクター一覧コマンドを処理
     *
     * @param {CommandInput} input コマンド引数
     * @returns {ResponseT} レスポンス
     */
    process(input) {
        assert(typeof input === 'object');
        logger.info(`キャラクター一覧コマンドを受理 ${input}`);

        // 一覧は花子モデルに持たせず、表示するときに読み込む
        const action = new VoiceCatalogLoadAction({ id: input.id });
        const onSuccess = (catalog) => showCatalog(input, catalog);
        const onFailure = input.newChatResponse('キャラクターの一覧を表示できません :sob:', 'error');
        return new ActionResponse({ id: input.id, action, onSuccess, onFailure });
    }
}

/**
 * 読み込んだ一覧をページ送りで表示するレスポンス
 *
 * @param {CommandInput} input コマンド引数
 * @param {VoiceCatalog} catalog 読み込んだ一覧
 * @returns {ResponseT}
 */
function showCatalog(input, catalog) {
    if (catalog.lines.length === 0) {
        return input.newChatResponse('キャラクターの一覧を表示できません :sob: 一覧が空でした', 'error');
    }
    // ページ会話レスポンス。1ページ目の上に使い方を添える
    const usage = input.usage('@hanako キャラクター変更 voicevox:ずんだもん/あまあま', '/speaker name:');
    const pager = new Pager(catalog);
    return input.newChatResponse(`${pager.show()}\n変更するには ${usage}`, 'pager');
}

module.exports = SpeakersCommand;

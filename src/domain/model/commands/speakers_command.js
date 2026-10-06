const path = require('path');
const logger = require('log4js').getLogger(path.basename(__filename));
const assert = require('assert').strict;
const Pager = require('../pager');

/** @typedef {import('./index').SlashCommandDefinition} SlashCommandDefinition */
/** @typedef {import('../../entity/command_input')} CommandInput */
/** @typedef {import('../../entity/responses').ResponseT} ResponseT */
/** @typedef {import('../hanako')} Hanako */

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

        const catalog = this.hanako.voiceCatalog;
        if (!catalog || !catalog.available || catalog.lines.length === 0) {
            return input.newChatResponse(
                'キャラクターの一覧を表示できません :sob: 音声エンジンが一覧に対応していないか、一覧を取得できませんでした',
                'error'
            );
        }

        // ページ会話レスポンス。1ページ目の上に使い方を添える
        const usage = input.usage('@hanako キャラクター変更 voicevox:ずんだもん/あまあま', '/speaker name:');
        const pager = new Pager(catalog);
        return input.newChatResponse(`${pager.show()}\n変更するには ${usage}`, 'pager');
    }
}

module.exports = SpeakersCommand;

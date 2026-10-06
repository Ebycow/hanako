const path = require('path');
const logger = require('log4js').getLogger(path.basename(__filename));
const VoiceAutocompleteService = require('../service/voice_autocomplete_service');
const errors = require('../core/errors').promises;

/** @typedef {import('discord.js').Client} discord.Client */
/** @typedef {import('discord.js').Interaction} discord.Interaction */

/**
 * Autocompleteコントローラ
 * - スラッシュコマンドの入力中に候補を返す
 * - interactionCreateイベントを受け取る
 *
 * 候補を返せなくても入力自体はできるため、失敗したら候補なしで応答する
 */
class AutocompleteCtrl {
    /**
     * @param {discord.Client} client Discord Botのクライアント
     */
    constructor(client) {
        this.client = client;
        this.voiceService = new VoiceAutocompleteService();

        logger.trace('セットアップ完了');
    }

    /**
     * 自動補完の要求を処理
     * - 自動補完以外のインタラクションのとき errors.abort
     *
     * @param {discord.Interaction} interaction 受信したインタラクション
     * @returns {Promise<void>}
     */
    async onAutocomplete(interaction) {
        if (!interaction.isAutocomplete()) {
            return errors.abort();
        }

        const focused = interaction.options.getFocused(true);
        let choices = [];
        try {
            if (interaction.commandName === 'speaker' && focused.name === 'name') {
                choices = await this.voiceService.suggest(focused.value);
            }
        } catch (err) {
            logger.warn('読み上げキャラクターの候補を取得できなかった', err.message);
        }

        // 3秒以内に応答しないと失効する。失効していても入力は続けられるので、失敗はログだけ残す
        await interaction.respond(choices).catch((e) => logger.warn('自動補完の応答に失敗', e.message));
    }
}

module.exports = AutocompleteCtrl;

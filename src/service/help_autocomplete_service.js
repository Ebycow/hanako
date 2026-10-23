const HelpCommand = require('../domain/model/commands/help_command');

// Discordの自動補完の候補は25件まで、名前と値は100文字まで
const MAX_CHOICES = 25;
const MAX_LENGTH = 100;

/**
 * アプリケーションサービス
 * help コマンドで指定するコマンド名の自動補完の候補を作る
 */
class HelpAutocompleteService {
    /**
     * 入力中の文字列から候補を作る
     *
     * @param {string} input 入力中の文字列
     * @returns {Array<{name: string, value: string}>} 候補
     */
    suggest(input) {
        const text = typeof input === 'string' ? input : '';
        return HelpCommand.searchCommands(text)
            .map((K) => {
                const label = `/${K.slash.name} ${K.slash.description}`;
                const name = label.length > MAX_LENGTH ? label.slice(0, MAX_LENGTH - 1) + '…' : label;
                return { name, value: K.slash.name };
            })
            .slice(0, MAX_CHOICES);
    }
}

module.exports = HelpAutocompleteService;

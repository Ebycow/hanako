const { Replacive } = require('./replacive');
const { Responsive } = require('./responsive');
const { RequestConverter } = require('./converter');
const { CommandResult } = require('./commandresult');
const { MessageContext } = require('../contexts/messagecontext');

/**
 * コマンドクラス共通インターフェイス
 *
 * @interface
 */
class Command {
    /**
     * @param {MessageContext} context メッセージコンテキスト
     * @param {string} name コマンド名
     * @param {string[]} args コマンド引数
     * @returns {CommandResult|Promise<CommandResult>} コマンド結果
     * @abstract
     */
    process(context, name, args) {
        throw new Error('Not Implemented');
    }
}

/**
 * ReplaciveかつCommandなクラス
 *
 * @implements {Replacive}
 * @implements {Command}
 */
class ReplaciveCommand extends Command {}

Replacive.applyToClass(ReplaciveCommand);

/**
 * ResponsiveかつCommandなクラス
 *
 * @implements {Responsive}
 * @implements {Command}
 */
class ResponsiveCommand extends Command {}

Responsive.applyToClass(ResponsiveCommand);

/**
 * RequestConverterかつCommandなクラス
 *
 * @implements {RequestConverter}
 * @implements {Command}
 */
class ConverterCommand extends Command {}

RequestConverter.applyToClass(ConverterCommand);

/**
 * ResponsiveかつRequestConverterかつCommandなクラス
 */
class ResponsiveConverterCommand extends Command {}

Responsive.applyToClass(ResponsiveConverterCommand);
RequestConverter.applyToClass(ResponsiveConverterCommand);

/**
 * ResponsiveかつReplaciveかつCommandなクラス
 */
class ResponsiveReplacerCommand extends Command {}

Responsive.applyToClass(ResponsiveReplacerCommand);
Replacive.applyToClass(ResponsiveReplacerCommand);

const CommandNames = {
    JOIN: ['お願い', 'plz', 'summon', 's'],
    LEAVE: ['さようなら', 'bye', 'b'],
    ASK: ['ask'],
    LIMIT: ['limit', 'readlimit'],
    TEACH: ['教育', 'teach', 'wbook-add', 'mk'],
    FORGET: ['忘却', 'forget', 'wbook-delete', 'rm'],
    DIC_ALLDELETE: ['wbook-alldel', 'alldelete'],
    DICTIONARY: ['dictionary', 'wbook-list', 'dic'],
    SEIBAI: ['seibai', 'stop'],
    SE_ADD: ['se-add'], // FIXME もっとイケてるコマンドに
    SE_DELETE: ['se-del'], // FIXME もっとイケてるコマンドに！！
    SE_LIST: ['se-list'], // FIXME もっとイケてるコマンドに！！！！
    BLACKLIST_ADD: ['blacklist-add'],
    BLACKLIST_REMOVE: ['blacklist-remove'],
    BLACKLIST_SHOW: ['blacklist-show'],
};

module.exports = {
    Command,
    ReplaciveCommand,
    ResponsiveCommand,
    ConverterCommand,
    ResponsiveConverterCommand,
    ResponsiveReplacerCommand,
    CommandNames,
};

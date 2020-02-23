const { Replacive } = require('./replacive');
const { RequestConverter } = require('./converter');
const { CommandResult } = require('./commandresult');
const { MessageContext } = require('../contexts/messagecontext');

/**
 * コマンドクラス共通インターフェイス
 * @interface
 */
class Command {

    /**
     * @param {MessageContext} context メッセージコンテキスト
     * @param {string} name コマンド名
     * @param {string[]} args コマンド引数
     * @returns {CommandResult|Promise<CommandResult>} コマンド結果
     * @virtual 
     */
    process(context, name, args) { throw new Error('Not Implemented'); }

}

/**
 * ReplaciveかつCommandなクラス
 * @implements Replacive
 * @implements Command
 */
class ReplaciveCommand extends Command {}

Replacive.applyToClass(ReplaciveCommand);

/**
 * RequestConverterかつCommandなクラス
 */
class ConverterCommand extends Command {}

RequestConverter.applyToClass(ConverterCommand);

const CommandNames = {
    JOIN: ['お願い', 'plz', "summon", "s"],
    LEAVE: ['さようなら', 'bye', "b"],
    ASK: ['ask'],
    LIMIT: ['limit', 'readlimit'],
    TEACH: ['教育', 'teach', 'wbook-add', "mk"],
    FORGET: ['忘却', 'forget', 'wbook-delete', "rm"],
    DIC_ALLDELETE: ['wbook-alldel', "alldelete"],
    DICTIONARY: ['dictionary', 'wbook-list', "dic"],
    SEIBAI: ['seibai', 'stop'],
    SE_ADD: ['se-add'], // FIXME もっとイケてるコマンドに
    SE_DELETE: ['se-del'], // FIXME もっとイケてるコマンドに！！
};

module.exports = {
    Command, ReplaciveCommand, ConverterCommand, CommandNames
};

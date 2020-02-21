const { Replacive } = require('./replacive');
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

const CommandNames = {
    JOIN: ['plz', "p", "summon", "s"],
    LEAVE: ['bye', "b"],
    ASK: ['ask'],
    LIMIT: ['limit', 'readlimit'],
    TEACH: ['teach', 'wbook-add'],
    FORGET: ['forget', 'wbook-delete'],
    SEIBAI: ['seibai', 'stop']
};

module.exports = {
    Command, ReplaciveCommand, CommandNames
};

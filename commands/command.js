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

    /**
     * @param {string} text 入力テキスト
     * @returns {string} 置換後テキスト
     * @virtual
     */
    replace(text) { throw new Error('Not Implemented'); }

    /**
     * @returns {number} `replace`メソッドが呼ばれる順番を決める優先度（より小さい数字が先）
     * @virtual
     */
    replacePriority() { throw new Error('Not Implemented'); }

}

const CommandNames = {
    JOIN: 'plz',
    LEAVE: 'bye',
    ASK: 'ask',
    LIMIT: 'limit',
    TEACH: 'teach',
    FORGET: 'forget',
    SEIBAI: 'seibai'
};

module.exports = {
    Command, CommandNames
};

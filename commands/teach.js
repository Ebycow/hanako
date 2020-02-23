const Datastore = require('nedb');
const table = require('text-table');
const { MessageContext } = require('../contexts/messagecontext');
const { ReplaciveCommand, CommandNames } = require('./command');
const { CommandResult, ResultType } = require('./commandresult');
const { EmojiReplacer } = require('../utils/replacer');

const sharedDbInstance = new Datastore({ filename: './db/teach.db', autoload: true });
sharedDbInstance.loadDatabase();

// 定期的にDBを圧縮
sharedDbInstance.persistence.setAutocompactionInterval(86400000);

const dictSort = (a, b) => {
    if (a[0].length > b[0].length) {
        return -1;
    }

    if (a[0].length < b[0].length) {
        return 1;
    } 

    return 0;
}

/**
 * @implements Command
 * @implements Replacive
 * @implements Initable
 */
class TeachCommand extends ReplaciveCommand {

    /**
     * @param {string} primaryKey 
     */
    constructor(primaryKey) {
        super();
        this.id = primaryKey;
        this.dictionary = [];
        this._db = null;
    }

    /**
     * @returns {Promise<void>}
     * @override
     */
    async asyncInit() {
        await this.loadDbInstance();
    }

    /**
     * @returns {Promise<Nedb>}
     * @private
     */
    loadDbInstance() {
        if (this._db) {
            return Promise.resolve(this._db);
        } else {
            return new Promise((resolve, reject) => {
                sharedDbInstance.findOne({ id: this.id }, (err, docs) => {
                    if (err) {
                        return reject(err);
                    }
        
                    if(docs) {
                        this.dictionary = docs.dict;
                        this._db = sharedDbInstance;
                        return resolve(this._db);

                    } else {
                        sharedDbInstance.insert({ id : this.id, dict : []}, (err) => {
                            if (err) {
                                return reject(err);
                            }

                            this._db = sharedDbInstance;
                            resolve(this._db);

                        });
                    }
                });
            });
        }
    }

    saveDict() {
        return this.loadDbInstance().then(db => new Promise((resolve, reject) =>
            db.update({ id: this.id }, { $set : { dict : this.dictionary } }, (err) => {
                if(err) {
                    return reject(err);
                } else {
                    return resolve();
                }
    
            })));
    }

    /**
     * @param {MessageContext} context
     * @param {string} name
     * @param {string[]} args
     * @returns {Promise<CommandResult>}
     * @override
     */
    process(context, name, args) {
        if(!context.isJoined()) {
            return Promise.resolve(this.doNotJoinError());

        }

        for (const cmd of CommandNames.TEACH) {
            if (name === cmd) {
                return this.doTeach(args);
            }
        }
        
        for (const cmd of CommandNames.FORGET) {
            if (name === cmd) {
                return this.doForget(args);
            }
        }

        for (const cmd of CommandNames.DICTIONARY) {
            if (name === cmd) {
                return Promise.resolve(this.doShowList());
            }
        }

        for (const cmd of CommandNames.DIC_ALLDELETE) {
            if (name === cmd) {
                return this.doAllDelete(args);
            }
        }

        throw new Error('unreachable');
    }

    /**
     * @returns {CommandResult} 
     */
    doNotJoinError() {
        return new CommandResult(ResultType.REQUIRE_JOIN, 'そのコマンドはどこかのチャンネルに私を招待してから使ってね :sob:');
    }

    /**
     * @param {string[]} args
     * @returns {Promise<CommandResult>} 
     */
    async doTeach(args) {
        if (args.length < 2) {
            return new CommandResult(ResultType.INVALID_ARGUMENT, 'コマンドの形式が間違っています（teach from to） :sob:');
        }

        const noEmojiArgs = args.map(x => EmojiReplacer.replace(x));

        const from = noEmojiArgs[0];
        const to = noEmojiArgs[1];
        const force = noEmojiArgs[2] === '--force';
        
        // バリデーション
        if(!(from.length >= 2)){
            return new CommandResult(ResultType.INVALID_ARGUMENT, '一文字教育はできないよ');

        }

        const MAX_TEACH_WORDLENGTH = 50;
        if(from.length > MAX_TEACH_WORDLENGTH || to.length > MAX_TEACH_WORDLENGTH) {
            return new CommandResult(ResultType.INVALID_ARGUMENT, `もじながすぎわろたwwww ${MAX_TEACH_WORDLENGTH}文字以上の教育はできません`); 
        }

        // 重複チェック
        let dupId = -1;
        this.dictionary.forEach((rep, index) => {
            if (rep[0] == from) {
                dupId = index;

            }

        });

        let result;
        if (dupId >= 0) {
            if(!force){
                const errorMsg = `既に教育済みの単語です！${ this.dictionary[dupId][0] } -> ${ this.dictionary[dupId][1] } \n__強制的に置き換える場合はコマンドに --force を付けてください(?rm from to --force)__`;
                result = new CommandResult(ResultType.ALREADY_EXISTS, errorMsg);

            } else {
                this.dictionary[dupId] = [from, to];
                result =  new CommandResult(ResultType.SUCCESS, `置換ちました！ ${ from } -> ${ to } :bulb:`);

            }

        } else {
            this.dictionary.push([from, to]);
            result =  new CommandResult(ResultType.SUCCESS, `覚えました！ ${ from } -> ${ to } :bulb:`);

        }

        this.dictionary.sort(dictSort);

        await this.saveDict();
        console.log(this.dictionary);

        return result;
    }

    /**
     * @param {string[]} args
     * @returns {Promise<CommandResult>} 
     */
    async doForget(args) {
        if (args.length < 1) {
            // 引数が指定されなかったときの処理
            return new CommandResult(ResultType.INVALID_ARGUMENT, null);
        }

        // emoji置き換えも行う
        const word = EmojiReplacer.replace(args[0]);

        let popId = -1;
        this.dictionary.forEach((rep, index) => {
            if (rep[0] == word) {
                popId = index;

            }

        });

        let result;
        if (popId >= 0) {
            this.dictionary.splice(popId, 1);
            result = new CommandResult(ResultType.SUCCESS, `1 2の…ポカン！${ word }を忘れました！ :bulb:`);
            this.dictionary.sort(dictSort);
            await this.saveDict();

        } else {
            result = new CommandResult(ResultType.NOT_FOUND, 'その単語は教育されていません');
        
        }

        return result;

    }

    /**
     * @returns {CommandResult} 
     */
    doShowList() {
        let replyText = "覚えた単語の一覧だよ！:\n";
        return new CommandResult(ResultType.SUCCESS, replyText + table(this.dictionary));
    }

    /**
     * @param {string[]} args
     * @returns {Promise<CommandResult>} 
     */
    async doAllDelete(args) {
        const force = args[0] === '--force';
        let result;

        if(force){
            result = new CommandResult(ResultType.SUCCESS, `まっさらに生まれ変わって　人生一から始めようが\nへばりついて離れない　地続きの今を歩いているんだ :bulb:`);
            this.dictionary = [];
            await this.saveDict();

        } else {
            result = new CommandResult(ResultType.REQUIRE_CONFIRM, `**ほんとうにけすのですか？、こうかいしませんね？\n すべての単語を削除する場合はコマンドに --force を付けてください(?alldelete --force)**`);
        }

        return result;
    }

    /**
     * @param {MessageContext} context
     * @param {string} text 
     * @returns {string}
     * @override
     */
    replace(context, text) {
        for (const rep of this.dictionary) {
            text = this.wordReplacer(text, rep[0], rep[1]);

        }

        return text;

    }

    /**
     * @param {string} str
     * @param {string} before 
     * @param {string} after 
     * @returns {string}
     * @override
     */
    wordReplacer (str, before, after) {
        return str.split(before).join(after);

    };

    /**
     * @returns {number}
     * @override
     */
    replacePriority() { 
        return 0x0010;
    }

}

module.exports = {
    TeachCommand
};

const fs = require('fs');
const Datastore = require('nedb');
const { MessageContext } = require('../contexts/messagecontext');
const { ReplaciveCommand, CommandNames } = require('./command');
const { CommandResult, ResultType } = require('./commandresult');
const { EmojiReplacer } = require('../utils/replacer');

const db = new Datastore({ filename: './db/teach.db', autoload: true });
db.loadDatabase()
11
// 定期的にDBを圧縮
db.persistence.setAutocompactionInterval(86400000)

const dictSort = (a, b) => {
    if (a[0].length > b[0].length) {
        return -1;
    }

    if (a[0].length < b[0].length) {
        return 1;
    } 

    return 0;
}

class TeachCommand extends ReplaciveCommand {

    constructor(guild) {
        super();
        this.id = guild.id;
        this.dictionary = [];

        db.findOne({ id: this.id }, (err, docs) => {
            if(err) {
                throw err;
            }
            console.log(docs.dict)
            if(docs) {
                this.dictionary = docs.dict

            } else {
                db.insert({ id : this.id, dict : []}, (err) => {
                    if(err) {
                        throw err;

                    }

                });
            }
            
        });

    }

    saveDict() {
        db.update({ id: this.id }, { $set : { dict : this.dictionary } }, (err) => {
            if(err) {
                throw err;

            }

        });
        
    }

    /**
     * @param {MessageContext} context
     * @param {string} name
     * @param {string[]} args
     * @returns {CommandResult}
     * @override
     */
    process(context, name, args) {
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
                return this.doShowList();
            }
        }

        throw new Error('unreachable');
    }

    /**
     * @param {string[]} args
     * @returns {CommandResult} 
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

        this.saveDict();
        console.log(this.dictionary);

        return result;
    }

    /**
     * @param {string[]} args
     * @returns {CommandResult} 
     */
    doForget(args) {
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
            this.dictionary.pop(popId);
            result = new CommandResult(ResultType.SUCCESS, `1 2の…ポカン！${ word }を忘れました！ :bulb:`);
            this.dictionary.sort(dictSort);
            this.saveDict();

        } else {
            result = new CommandResult(ResultType.NOT_FOUND, 'その単語は教育されていません');
        
        }

        return result;

    }

    doShowList() {
        let replyText = "覚えた単語の一覧だよ！:\n";
        console.log(this.dictionary);
        for (const rep of this.dictionary) {
            console.log(rep)
            replyText += `${rep[0]} -> ${rep[1]}\n`;

        }
        return new CommandResult(ResultType.SUCCESS, replyText);
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

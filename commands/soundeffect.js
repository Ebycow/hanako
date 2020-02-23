const Datastore = require('nedb');
const { MessageContext } = require('../contexts/messagecontext');
const { ConverterCommand, CommandNames } = require('./command');
const { CommandResult, ResultType } = require('./commandresult');
const { FileAdapterManager } = require('../adapters/fileadapter');
const { AudioRequest, SoundRequest } = require('../models/audiorequest');

const sharedDbInstance = new Datastore({ filename: './db/soundeffect.db', autoload: true });
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
 * @implements Converter
 * @implements Initable
 */
class SoundEffectCommand extends ConverterCommand {

    // FIXME!!
    // 以下テキストとかTeachの改変で超適当です
    // いい感じにしてください :sob:

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

        for (const cmd of CommandNames.SE_ADD) {
            if (name === cmd) {
                return this.doAdd(args);
            }
        }

        for (const cmd of CommandNames.SE_DELETE) {
            if (name === cmd) {
                return this.doDelete(args);
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
    async doAdd(args) {
        if (args.length < 2) {
            return new CommandResult(ResultType.INVALID_ARGUMENT, 'コマンドの形式が間違っています（se-add word url） :sob:');
        }

        const word = args[0];
        const url = args[1];
        
        // バリデーション
        if(!(word.length >= 2)){
            return new CommandResult(ResultType.INVALID_ARGUMENT, '一文字設定はできないよ');

        }

        const MAX_TEACH_WORDLENGTH = 50;
        if(word.length > MAX_TEACH_WORDLENGTH) {
            return new CommandResult(ResultType.INVALID_ARGUMENT, `もじながすぎわろたwwww ${MAX_TEACH_WORDLENGTH}文字以上の設定はできません`); 
        }

        // 重複チェック
        let dupId = -1;
        this.dictionary.forEach((rep, index) => {
            if (rep[0] == word) {
                dupId = index;

            }

        });

        let result;
        if (dupId >= 0) {
            const errorMsg = `既に設定済みの単語です！${ this.dictionary[dupId][0] }`;
            result = new CommandResult(ResultType.ALREADY_EXISTS, errorMsg);

        } else {
            const base64word = Buffer.from(word).toString('base64');
            console.log(word, base64word);
            await FileAdapterManager.saveSoundFile(this.id, base64word, url);

            this.dictionary.push([word, url]);
            result =  new CommandResult(ResultType.SUCCESS, `設定しました！ ${ word } -> ${ url } :bulb:`);

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
    async doDelete(args) {
        if (args.length < 1) {
            // 引数が指定されなかったときの処理
            return new CommandResult(ResultType.INVALID_ARGUMENT, null);
        }

        const word = args[0];

        let popId = -1;
        this.dictionary.forEach((rep, index) => {
            if (rep[0] == word) {
                popId = index;

            }

        });

        let result;
        if (popId >= 0) {
            const base64word = Buffer.from(word).toString('base64');
            await FileAdapterManager.deleteSoundFile(this.id, base64word);
            this.dictionary.splice(popId, 1);
            result = new CommandResult(ResultType.SUCCESS, `1 2の…ポカン！${ word }のSE設定を削除しました！ :bulb:`);
            this.dictionary.sort(dictSort);
            await this.saveDict();

        } else {
            result = new CommandResult(ResultType.NOT_FOUND, 'その単語は設定されていません');
        
        }

        return result;

    }


    /**
     * @param {MessageContext} context
     * @param {Array<string|AudioRequest>} array
     * @returns {Array<string|AudioRequest>}
     * @override
     */
    convert(context, array) {
        /**
         * @param {string|AudioRequest} value 
         * @param {[string, string]} rep 
         * @returns {Array<string|AudioRequest>}
         */
        const wrap = (value, rep) => {
            if (typeof value !== 'string') {
                return [value];
            }
            const text = value;
            const word = rep[0];
            if (text.includes(word)) {
                const base64word = Buffer.from(word).toString('base64');
                const xs = text.split(word).map(x => [x]).reduceRight((acc, xs) => xs.concat([new SoundRequest(this.id, base64word)], acc));
                return xs.filter(v => v !== '');
            } else {
                return [text];
            }
        };

        const arr = this.dictionary.reduce((acc, rep) => acc.map(v => wrap(v, rep)).flat(), array);
        console.log(array, arr);
        return arr;
    }

    /**
     * @returns {number}
     * @override
     */
    convertPriority() {
        return 0x0010;
    }

}

module.exports = {
    SoundEffectCommand
};

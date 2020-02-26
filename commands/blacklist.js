const Datastore = require('nedb');
const table = require('text-table');
const { MessageContext } = require('../contexts/messagecontext');
const { ConverterCommand, CommandNames } = require('./command');
const { CommandResult, ResultType } = require('./commandresult');
const { NoopRequest } = require('../models/audiorequest')

const sharedDbInstance = new Datastore({ filename: './db/blacklist.db', autoload: true });
sharedDbInstance.loadDatabase();

// 定期的にDBを圧縮
sharedDbInstance.persistence.setAutocompactionInterval(86400000);

/**
 * @implements Command
 * @implements Replacive
 * @implements Initable
 */
class BlackListCommand extends ConverterCommand {

    /**
     * @param {string} primaryKey 
     */
    constructor(primaryKey) {
        super();
        this.id = primaryKey;
        this.userList = [];
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
                        this.userList = docs.users;
                        this._db = sharedDbInstance;
                        return resolve(this._db);

                    } else {
                        sharedDbInstance.insert({ id : this.id, users : []}, (err) => {
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

    saveUserList() {
        return this.loadDbInstance().then(db => new Promise((resolve, reject) =>
            db.update({ id: this.id }, { $set : { users : this.userList } }, (err) => {
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

        for (const cmd of CommandNames.BLACKLIST_ADD) {
            if (name === cmd) {
                return this.doAddUser(context.mentionedUsers, args);
            }

        }
        
        for (const cmd of CommandNames.BLACKLIST_REMOVE) {
            if (name === cmd) {
                return this.doRemoveUser(context.mentionedUsers, args);
            }

        }

        for (const cmd of CommandNames.BLACKLIST_SHOW) {
            if (name === cmd) {
                return Promise.resolve(this.doShowList());
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
     * @param {Map<string, string>} users
     * @param {string[]} args
     * @returns {Promise<CommandResult>} 
     */
    async doAddUser(users, args) {
        if(!(args.length === 1)) {
            return new CommandResult(ResultType.INVALID_ARGUMENT, null);
        }

        if(!(args[0].startsWith('@'))) {
            // ユーザ名が指定されていない
            return new CommandResult(ResultType.INVALID_ARGUMENT, null);
        }

        let result =  new CommandResult(ResultType.SUCCESS, `:sob:`);

        const targetUsername = args[0].slice(1);
        const targetUserId = users.get(targetUsername);
        this.userList.push(targetUserId);

        await this.saveUserList();
        result =  new CommandResult(ResultType.SUCCESS, `${targetUsername} 静かにして！！！ :bulb:`);

        return result;

    }

    /**
     * @param {string[]} args
     * @returns {Promise<CommandResult>} 
     */
    async doRemoveUser(users, args) {
        if(!(args.length === 1)) {
            return new CommandResult(ResultType.INVALID_ARGUMENT, null);
        }

        if(!(args[0].startsWith('@'))) {
            // ユーザ名が指定されていない
            return new CommandResult(ResultType.INVALID_ARGUMENT, null);
        }

        const targetUsername = args[0].slice(1);
        const targetUserId = users.get(targetUsername);

        let popId = -1;
        this.userList.forEach((id, index) => {
            if (id === targetUserId) {
                popId = index;

            }

        });

        let result;
        if (popId >= 0) {
            this.userList.splice(popId, 1);
            result = new CommandResult(ResultType.SUCCESS, `${targetUsername} ごめんね、またおはなししてね :bulb:`);
            await this.saveUserList();

        } else {
            result = new CommandResult(ResultType.NOT_FOUND, 'そのユーザはしっかりと読み上げています');
        
        }

        return result;

    }

    /**
     * @returns {CommandResult} 
     */
    doShowList() {
        let replyText = "読み上げていないユーザの一覧だよ！:\n----\n";
        return new CommandResult(ResultType.SUCCESS, replyText + table(this.userList.map(id => [`<@${id}>`])));
    }


    /**
     * @param {MessageContext} context
     * @param {Array<string|AudioRequest>} array
     * @returns {Array<string|AudioRequest>}
     * @override
     */
    convert(context, array) {
        let isMuteuser = false;
        this.userList.forEach((userId) => {
            if(userId === context.authorId) {
                isMuteuser = true;

            }

        });

        if(isMuteuser) {
            return [new NoopRequest()]

        } else {
            return array;

        }

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
    BlackListCommand
};

const { Initable } = require('./initable');
const { Replacive } = require('./replacive');
const { Responsive } = require('./responsive');
const { RequestConverter } = require('./converter');
const { Command, CommandNames } = require('./command');
const { JoinCommand } = require('./join');
const { LeaveCommand } = require('./leave');
const { AskCommand } = require('./ask');
const { LimitCommand } = require('./limit');
const { SeibaiCommand } = require('./seibai');
const { TeachCommand } = require('./teach');
const { SoundEffectCommand } = require('./soundeffect');
const { TextConverter } = require('./textconverter');
const { BlackListCommand } = require('./blacklist');

/**
 * @augments {Map<string, Command>}
 */
class Commands extends Map {
    /**
     * @param {string} primaryKey
     */
    constructor(primaryKey) {
        super();

        const teach = new TeachCommand(primaryKey);
        const soundeffect = new SoundEffectCommand(primaryKey);
        const blacklist = new BlackListCommand(primaryKey);

        const commandDefinitions = [
            [CommandNames.JOIN, new JoinCommand()],
            [CommandNames.LEAVE, new LeaveCommand()],
            [CommandNames.ASK, new AskCommand()],
            [CommandNames.LIMIT, new LimitCommand()],
            [CommandNames.SEIBAI, new SeibaiCommand()],
            [CommandNames.TEACH, teach],
            [CommandNames.FORGET, teach],
            [CommandNames.DICTIONARY, teach],
            [CommandNames.DIC_ALLDELETE, teach],
            [CommandNames.SE_ADD, soundeffect],
            [CommandNames.SE_DELETE, soundeffect],
            [CommandNames.SE_LIST, soundeffect],
            [CommandNames.BLACKLIST_ADD, blacklist],
            [CommandNames.BLACKLIST_REMOVE, blacklist],
            [CommandNames.BLACKLIST_SHOW, blacklist],
        ];

        this._replacives = [];
        this._responsives = [];
        this._converters = [new TextConverter()];

        for (const cmddef of commandDefinitions) {
            for (const commandName of cmddef[0]) {
                this.set(commandName, cmddef[1]);
            }
        }
    }

    async init() {
        const inits = new Set(
            Array.from(this.values())
                .concat(this._replacives)
                .filter(v => v instanceof Initable)
        );
        for (const initable of inits) {
            await initable.asyncInit();
        }
    }

    /**
     * @returns {Replacive[]}
     */
    get replacives() {
        const reps = Array.from(this.values()).filter(v => v instanceof Replacive);
        return [...new Set(reps.concat(this._replacives))];
    }

    /**
     * @returns {RequestConverter[]}
     */
    get converters() {
        const convs = Array.from(this.values()).filter(v => v instanceof RequestConverter);
        return [...new Set(convs.concat(this._converters))];
    }

    /**
     * @returns {Responsive[]}
     */
    get responsives() {
        const resps = Array.from(this.values()).filter(v => v instanceof Responsive);
        return [...new Set(resps.concat(this._responsives))];
    }
}

module.exports = {
    Commands,
};

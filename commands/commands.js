const { Replacive } = require('./replacive');
const { DiscordTagReplacer } = require('./replacives');
const { Command, CommandNames } = require('./command');
const { JoinCommand } = require('./join');
const { LeaveCommand } = require('./leave');
const { AskCommand } = require('./ask');
const { LimitCommand } = require('./limit');
const { SeibaiCommand } = require('./seibai');
const { TeachCommand } = require('./teach');

/**
 * @extends {Map<string, Command>}
 */
class Commands extends Map {

    constructor(guild) {
        super();

        const teach = new TeachCommand(guild);

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
        ];

        this._replacives = [];
        this._replacives.push(new DiscordTagReplacer());
        
        for (const cmddef of commandDefinitions) {
            for (const commandName of cmddef[0]) {
                this.set(commandName, cmddef[1])
            }

        }

    }

    /**
     * @returns {Replacive[]}
     */
    get replacives() {
        const reps = Array.from(this.values()).filter(v => v instanceof Replacive).filter((v, i, a) => a.indexOf(v) === i);
        return [...new Set(reps.concat(this._replacives))];
    }

}

module.exports = {
    Commands
};

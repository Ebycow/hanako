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

        this._replacives = [];
        this._replacives.push(new DiscordTagReplacer());
        
        this.set(CommandNames.JOIN, new JoinCommand());
        this.set(CommandNames.LEAVE, new LeaveCommand());
        this.set(CommandNames.ASK, new AskCommand())
        this.set(CommandNames.LIMIT, new LimitCommand());
        this.set(CommandNames.SEIBAI, new SeibaiCommand());
        
        const teach = new TeachCommand(guild);
        this.set(CommandNames.TEACH, teach);
        this.set(CommandNames.FORGET, teach);
    }

    /**
     * @returns {Replacive[]}
     */
    get replacives() {
        const reps = Array.from(this.values()).filter(v => v instanceof Replacive);
        return [...new Set(reps.concat(this._replacives))];
    }

}

module.exports = {
    Commands
};

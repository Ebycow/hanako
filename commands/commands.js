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

    constructor() {
        super();
        
        this.set(CommandNames.JOIN, new JoinCommand());
        this.set(CommandNames.LEAVE, new LeaveCommand());
        this.set(CommandNames.ASK, new AskCommand())
        this.set(CommandNames.LIMIT, new LimitCommand());
        this.set(CommandNames.SEIBAI, new SeibaiCommand());
        
        const teach = new TeachCommand();
        this.set(CommandNames.TEACH, teach);
        this.set(CommandNames.FORGET, teach);
    }

}

module.exports = {
    Commands
};

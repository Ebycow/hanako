const assert = require('assert').strict;

class MessageService {
    async serve() {
        assert(1 === 1);
        return 1;
    }
}

module.exports = MessageService;

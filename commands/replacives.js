const assert = require('assert').strict;
const { Replacive } = require('./replacive');

const tagRe = /<(a?:.+?:\d+)?(@!\d+)?(@\d+)?(#\d+)?(@&\d+)?>/g;
const emojiRe = /:(.+):/;

/**
 * Discordタグ置換リプレーサー
 */
class DiscordTagReplacer extends Replacive {
    
    /**
     * @param {string} message 
     * @param {Object} options 
     * @returns {string}
     * @override
     */
    replace(message, options) {
        const users = options.users;
        const channels = options.channels;
        const roles = options.roles;
        assert(users && channels && roles);

        message = message.replace(tagRe, (tag, emojiTag, botTag, userTag, channelTag, roleTag) => {
            if (typeof emojiTag !== 'undefined') {
                let emojiName = emojiTag.match(emojiRe)[1];
                return emojiName; 
            }
            if (typeof userTag !== 'undefined') {
                let userId = userTag.slice(1);
                return "@" + users.find('id', userId).username;
            }
            if (typeof botTag !== 'undefined') {
                let userId = botTag.slice(2);
                return "@" + users.find('id', userId).username;
            }
            if (typeof channelTag !== 'undefined') {
                let channelId = channelTag.slice(1);
                return channels.find('id', channelId).name; 
            }
            if (typeof roleTag !== 'undefined') {
                let roleId = roleTag.slice(2);
                return roles.find('id', roleId).name;
            }
        
            throw Error("unreachable");
        });

        return message;
    }

    /**
     * @returns {number}
     * @override
     */
    replacePriority() { 
        return 0xFFFE;
    }

}

module.exports = {
    DiscordTagReplacer
};

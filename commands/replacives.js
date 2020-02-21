const { MessageContext } = require('../contexts/messagecontext');
const { Replacive } = require('./replacive');

const tagRe = /<(a?:.+?:\d+)?(@!\d+)?(@\d+)?(#\d+)?(@&\d+)?>/g;
const emojiRe = /:(.+):/;

/**
 * Discordタグ置換リプレーサー
 */
class DiscordTagReplacer extends Replacive {
    
    /**
     * @param {MessageContext} context
     * @param {string} message 
     * @returns {string}
     * @override
     */
    replace(context, message) {
        message = message.replace(tagRe, (tag, emojiTag, botTag, userTag, channelTag, roleTag) => {
            if (typeof emojiTag !== 'undefined') {
                let emojiName = emojiTag.match(emojiRe)[1];
                return emojiName; 
            }
            if (typeof userTag !== 'undefined') {
                let userId = userTag.slice(1);
                return "@" + context.resolveUserName(userId);
            }
            if (typeof botTag !== 'undefined') {
                let userId = botTag.slice(2);
                return "@" + context.resolveUserName(userId);
            }
            if (typeof channelTag !== 'undefined') {
                let channelId = channelTag.slice(1);
                return context.resolveChannelName(channelId); 
            }
            if (typeof roleTag !== 'undefined') {
                let roleId = roleTag.slice(2);
                return context.resolveRoleName(roleId);
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

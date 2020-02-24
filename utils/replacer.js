const emoji = require('node-emoji');
const { MessageContext } = require('../contexts/messagecontext');

const re_url = /((ftp|http|https):\/\/(\w+:{0,1}\w*@)?(\S+)(:[0-9]+)?(\/|\/([\w#!:.?+=&%@!\-\/]))?)/gi;

const tagRe = /<(a?:.+?:\d+)?(@!\d+)?(@\d+)?(#\d+)?(@&\d+)?>/g;
const emojiRe = /:(.+):/;

/**
 * Discordタグ置換リプレーサー
 */
class DiscordTagReplacer {
    
    /**
     * @param {MessageContext} context
     * @param {string} message 
     * @returns {string}
     * @override
     */
    static replace(context, message) {
        message = message.replace(tagRe, (tag, emojiTag, botTag, userTag, channelTag, roleTag) => {
            if (typeof emojiTag !== 'undefined') {
                let emojiName = emojiTag.match(emojiRe)[1];
                return ':' + emojiName + ':'; 
            }
            if (typeof userTag !== 'undefined') {
                let userId = userTag.slice(1);
                return '@' + context.resolveUserName(userId);
            }
            if (typeof botTag !== 'undefined') {
                let userId = botTag.slice(2);
                return '@' + context.resolveUserName(userId);
            }
            if (typeof channelTag !== 'undefined') {
                let channelId = channelTag.slice(1);
                return '#' + context.resolveChannelName(channelId); 
            }
            if (typeof roleTag !== 'undefined') {
                let roleId = roleTag.slice(2);
                return '@' + context.resolveRoleName(roleId);
            }
        
            throw Error('unreachable');
        });

        return message;
    }

}

class UrlReplacer {
    static replace(message) {
        message = message.replace(re_url,"URL");

        return message;
    }

}

class EmojiReplacer {

    /**
     * @param {string} message
     * @returns {string} 
     */
    static replace(message) {
        return emoji.replace(message, (emoji) => `:${emoji.key}:`);
    }

}

module.exports = {
    DiscordTagReplacer,
    UrlReplacer,
    EmojiReplacer
};

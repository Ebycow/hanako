const emoji = require('node-emoji');

const tagRe = /<(a?:.+?:\d+)?(@!\d+)?(@\d+)?(#\d+)?(@&\d+)?>/g;
const emojiRe = /:(.+):/;

class DiscordTagReplacer {
    static replace(message, users, channels, roles) {
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

}

const re_url = /((ftp|http|https):\/\/(\w+:{0,1}\w*@)?(\S+)(:[0-9]+)?(\/|\/([\w#!:.?+=&%@!\-\/]))?)/gi;

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

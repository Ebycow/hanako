const tagRe = /<(a?:.+?:\d+)?(@!\d+)?(@\d+)?>/g;
const emojiRe = /:(.+):/;

class DiscordTagReplacer {
    static replace(message) {
        message = message.replace(tagRe, (tag, emojiTag, botTag, userTag) => {
            if (typeof emojiTag !== 'undefined') {
                let emojiName = emojiTag.match(emojiRe)[1];
                return emojiName; 
            }
            if (typeof userTag !== 'undefined') {
                let userId = userTag.slice(1);
                return "@" + msg.mentions.users.find("id", userId).username;
            }
            if (typeof botTag !== 'undefined') {
                let userId = botTag.slice(2);
                return "@" + msg.mentions.users.find("id", userId).username;
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

module.exports = {
    DiscordTagReplacer,
    UrlReplacer
};
const emoji = require('node-emoji');

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
    UrlReplacer,
    EmojiReplacer
};

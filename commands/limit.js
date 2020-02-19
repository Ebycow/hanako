class LimitCommand {
    constructor() {
        this.wordLimit = 120;
    }

    setLimit(msg) {
        if(msg.content.split(" ")[2]) {
            const num = msg.content.split(" ")[2];
            this.wordLimit = num;
        
        } else {
            this.wordLimit = 9999;
            
        }
        
        msg.reply(`読み上げる文字数を${this.wordLimit}文字に制限しました :no_entry:`);

    }

    replace(message) {
        if(message.length > this.wordLimit) {
            message = message.substr(0, this.wordLimit) + "以下略。";
        }

        return message;

    }

}

module.exports = {
    LimitCommand
}

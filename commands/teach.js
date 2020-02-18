const emoji = require('node-emoji')

class TeachCommand {
    constructor() {
        this.dictionary = []
        
    }

    doTeach(msg) {
        const text = emoji.replace(msg.content, (emoji) => `:${emoji.key}:`)

        const from = text.split(" ")[2];
        const to = text.split(" ")[3];

        if(from === undefined || to === undefined) {
            msg.reply("コマンドの形式が間違っています（teach from to） :sob:");

        } else {
            // 重複チェック
            let dupId = -1;
            this.dictionary.forEach((rep, index) => {
                if (rep[0] == from) {
                    dupId = index;

                }

            });

            if (dupId >= 0) {
                if(msg.content.split(" ")[4] !== "--force"){
                    msg.reply(`既に教育済みの単語です！${ this.dictionary[dupId][0] } -> ${ this.dictionary[dupId][1] } 強制的に置き換える場合はコマンドに --force を付けてください`);

                } else {
                    this.dictionary[dupId] = [from, to];
                    msg.reply(`置換ちました！ ${ from } -> ${ to } :bulb:`);

                }

            } else {
                this.dictionary.push([from, to]);
                msg.reply(`覚えました！ ${ from } -> ${ to } :bulb:`);

            }

            console.log(this.dictionary)

        }

    }

    doForget(msg) {
        // emoji置き換えも行う
        const word = emoji.replace(
            msg.content.split(" ")[2]　, (emoji) => `:${emoji.key}:`);

        let popId = -1;
        this.dictionary.forEach((rep, index) => {
            if (rep[0] == word) {
                popId = index;

            }

        });

        if (popId >= 0) {
            this.dictionary.pop(popId);
            msg.reply(`1 2の…ポカン！${ word }を忘れました！ :bulb:`);

        } else {
            msg.reply("その単語は教育されていません");

        }

    }

    replaceText(text) {
        for (const rep of this.dictionary) {
            text = text.replace(new RegExp(rep[0], 'g'), rep[1]);

        }

        return text;

    }

}

module.exports = {
    TeachCommand
}
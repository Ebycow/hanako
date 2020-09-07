const net = require('net');

class Bouyomi {

    constructor(host='localhost', tcpPort=50001) {
        this.hostname = host;
        this.port = tcpPort;

        this.client = new net.Socket();
        this.client.on('error', (e) => {
            if(e.errno === 'ECONNREFUSED'){
                console.error("エラー 棒読みちゃんを起動して、ホストとポートが間違ってないか確認して");
            }
            console.log(e);
        });
    }

    momiage(word="", command=1, speed=-1, tone=-1, volume=-1, voice=1) {

        const iCommand = new Buffer(2);
        const iSpeed = new Buffer(2);
        const iTone = new Buffer(2);
        const iVolume = new Buffer(2);
        const iVoice = new Buffer(2);
        const bCode = new Buffer(1);
        const bMessage = new Buffer(word, 'utf8');  //文字列のbyte配列
        const iLength = new Buffer(4);

        iCommand.writeInt16LE(command, 0);  //コマンド（ 0:メッセージ読み上げ）
        iSpeed.writeInt16LE(speed, 0);   //速度   （-1:棒読みちゃん画面上の設定）
        iTone.writeInt16LE(tone, 0);    //音程   （-1:棒読みちゃん画面上の設定）
        iVolume.writeInt16LE(volume, 0);  //音量   （-1:棒読みちゃん画面上の設定）
        iVoice.writeInt16LE(voice, 0);    //声質   （ 0:棒読みちゃん画面上の設定、1:女性1、2:女性2、3:男性1、4:男性2、5:中性、6:ロボット、7:機械1、8:機械2、10001～:SAPI5）
        bCode.writeInt8(0, 0);        //文字列のbyte配列の文字コード(0:UTF-8, 1:Unicode, 2:Shift-JIS)
        iLength.writeInt32LE(bMessage.length, 0); //文字列のbyte配列の長さ

        this.client.connect(this.port, this.hostname, () => {
            this.client.write(iCommand);   
            this.client.write(iSpeed);
            this.client.write(iTone);
            this.client.write(iVolume);
            this.client.write(iVoice);
            this.client.write(bCode);
            this.client.write(iLength);
            this.client.write(bMessage);
            this.client.end();
        });

    }

} 

module.exports = {
    Bouyomi,
}

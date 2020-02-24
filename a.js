const fs = require('fs');

let s = fs.createReadStream('./this/wont/exist');
s.on('ready', _ => console.log('it is ready'));
s.on('error', err => console.log('it is error', err.code));

let b = fs.createWriteStream('./this/never/exits');
b.on('finish', _ => console.log('finished'));
b.on('error', err => console.log('error is coming', err.code));


const { FileAdapterManager } = require('./adapters/fileadapter');

FileAdapterManager.init();

async function main() {
    await FileAdapterManager.saveSoundFile('test-segment', 'uiissu', 'https://cdn.discordapp.com/attachments/627943181287161868/681076132841521152/nc123011.mp3');
    console.log('done');

}

main();

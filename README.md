# Hanako
汎用Discordチャット読み上げBot

![img20200222233956](https://user-images.githubusercontent.com/18446038/75094313-4a370d80-55cd-11ea-9af1-71cec1bf1d20.png)

# Usage
## ボイスチャットへの参加、退出
参加させたいボイスチャットに参加し、読み上げたいテキストチャンネルに`@botname plz` と発言(または、`summon` `s`)
`@botname bye`(または、`bye` `b` ) で退出

## 単語の教育
ボイスチャットにボットを参加させた状態で `@botname teach 置換前の単語 置換後の単語` と発言  
`@botname forget 置換前の単語` と発言し削除  
`@botname alldelete` ですべての単語を削除  
`@botname dictionary` で教育済みの単語の一覧を表示

## 読み上げる文字数の制限
`@botname limit 30`で読み上げる文字数を30文字に制限
 
## SE機能
Discord上に音声ファイルをドラッグアンドドロップするなどして、音声ファイルのリンクを作成する  
ボイスチャットにボットを参加させた状態で `@botname se-add SE化する単語 SEの音声ファイルリンク( .wav mp3 )` と発言  
`@botname se-del SE化した単語` でSEを解除  
`@botname se-list` でSEの一覧を表示
 
## ブラックリスト（ユーザのミュート）
ボイスチャットにボットを参加させた状態で `@botname blacklist-add @username` と発言、@usernameの発言は読まれなくなる  
`@botname blacklist-remove @username` で解除  
`@botname blacklist-show` でミュート中のユーザの一覧を表示
 
## 成敗
`@botname seibai` で現在読み上げ中の音声（とそれ以降に読み上げる予定の音声）をすべて中断する

# Dependencies
* 気合

# Install
## 1.BOTの作成
Discord Developer Portalよりアプリケーションを作成し、ボットのTOKENを取得する必要があります  
参考: https://discordpy.readthedocs.io/ja/latest/discord.html#discord-intro

## 2.音声サーバの設定
準備中

## 3.hanakoのインストール
```
git pull https://github.com/Ebycow/hanako.git
cd hanako
npm i
```

hanakoディレクトリ直下に.envファイルを作成  
**1.BOTの作成**にて作成したtokenを記述
```
TOKEN=XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
```

起動
```
node index
```

# VS.
喋太郎: https://twitter.com/syabetaro - More cute voice

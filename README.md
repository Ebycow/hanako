# Hanako
汎用Discordチャット読み上げ(TTS)Bot

# Usage
## はなことの対話
はなこにコマンド入力してあげると、様々な機能を利用できる  
コマンド入力は、テキストチャンネルに`@botname コマンド名` のリプライ形式、もしくは `>コマンド名`と発言することで行う
## コマンド一覧

| 機能               | コマンド                    | 例                                                     |
|--------------------|-----------------------------|--------------------------------------------------------|
| VC参加             | お願い plz summon s         | @hanako お願い                                         |
| VC離脱             | さようなら bye b            | @hanako bye                                            |
| 文字数制限         | limit readlimit             | @hanako limit 20                                       |
| 教育（辞書機能）   | 教育 teach wbook-add mk     | @hanako 教育 HIKAKIN ヒカキン                          |
| 忘却（辞書機能）   | 忘却 forget wbook-delete rm | @hanako 忘却 SEIKIN                                    |
| 辞書全削除         | wbook-alldel alldelete      | @hanako alldelete                                      |
| 辞書一覧           | dictionary wbook-list dic   | @hanako dictionary                                     |
| 読上の中止         | seibai stop                 | @hanako seibai                                         |
| SEの追加           | se-add                      | @hanako se-add （泣く） https://...(音声ファイルのURL) |
| SEの削除           | se-del                      | @hanako se-del :seikin-osusume:                        |
| SEの一覧           | se-list                     | @hanako se-list                                        |
| ブラックリスト追加 | blacklist-add               | @hanako blacklist-add @seikin                          |
| ブラックリスト除外 | blacklist-remove            | @hanako blacklist-remove @hikakin                      |
| ブラックリスト一覧 | blacklist-show              | @hanako blacklist-show                                 |

## ボイスチャットへの参加、退出
参加させたいボイスチャットに参加し、読み上げたいテキストチャンネルに`@botname plz` と発言(または、`summon` `s`)
`@botname bye`(または、`bye` `b` ) で退出

## 単語の教育
ボイスチャットにはなこを参加させた状態で `@botname teach 置換前の単語 置換後の単語` と発言  
`@botname forget 置換前の単語` と発言し削除  
`@botname alldelete` ですべての単語を削除  
`@botname dictionary` で教育済みの単語の一覧を表示

## 読み上げる文字数の制限
`@botname limit 30`で読み上げる文字数を30文字に制限
 
## SE機能
Discord上に音声ファイルをドラッグアンドドロップするなどして、音声ファイルのリンクを作成する  
ボイスチャットにはなこを参加させた状態で `@botname se-add SE化する単語 SEの音声ファイルリンク( .wav mp3 )` と発言  
`@botname se-del SE化した単語` でSEを解除  
`@botname se-list` でSEの一覧を表示
 
## ブラックリスト（ユーザのミュート）
ボイスチャットにはなこを参加させた状態で `@botname blacklist-add @username` と発言、@usernameの発言は読まれなくなる  
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
GET /api/v1/audiofile?text=読み上げテキスト に対して、audio/wavにてストリームを返答する形式のオーディオサーバを任意にTTSの為に利用可能です

Ebyroidは、VoiceroidがインストールされたWindowsマシンを音声サーバとして利用可能にする唯一のアプリケーションです。  
動作には有効なライセンスを持つVoiceroidライブラリを所持している必要があります。アプリケーションのインストールは当該リポジトリから可能です https://github.com/nanokina/ebyroid

hanakoの標準設定では4090番ポートにある音声サーバに接続を行います（これは設定ファイルから変更可能です）  
これは、ebyroidのデフォルト起動時のポート番号設定に従います

```
C:\ebyroid> ebyroid.exe configure
C:\ebyroid> ebyroid.exe start 
```

## 3.hanakoのインストール
```
git clone https://github.com/Ebycow/hanako.git
cd hanako
npm i
```

hanakoディレクトリの`app-config-default.yml`をコピーし、`app-config.yml`にリネームし、discord_bot_tokenを **1.BOTの作成** にて作成したトークンに変更します

```
  # Discord Bot のトークン (必ず app-config.yml でオーバーライドしてください)
  discord_bot_token: 'nYank0Daisk1......'
```

起動
```
node index
```

# VS.
喋太郎: https://twitter.com/syabetaro - More cute voice

# Catgirl
![img20200222233956](https://user-images.githubusercontent.com/18446038/75094313-4a370d80-55cd-11ea-9af1-71cec1bf1d20.png)

彼女は凜々しい白猫でしたが、ある日降り積もるソメイヨシノを枕に眠りについたのち桃色に染まりました
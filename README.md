# Hanako
汎用Discordチャット読み上げ(TTS)Bot
強力なSE機能、任意の音声サーバに対応、複数サーバで高速に動作😼

# Did you in trouble?
問題が起きた場合は[Issueに投稿](https://github.com/Ebycow/hanako/issues/new)し、相互に共有してください。他の利用者の助けになります！  
ねこは寂しがり屋でお話が大好きです、開発メンバーのTwitterやDiscordのDMでこっそり質問しないで！😿

# Usage
## はなことの対話
はなこにコマンド入力してあげると、様々な機能を利用できる
コマンド入力は、テキストチャンネルに`@botname コマンド名` のリプライ形式、もしくは `>コマンド名`と発言することで行う
また、スラッシュコマンド（/コマンド名）も利用可能です。スラッシュコマンドでは引数が明確に指定され、説明が表示されます。
## コマンド一覧

| 機能               | コマンド                                    | 例                                                     |
|--------------------|---------------------------------------------|--------------------------------------------------------|
| VC参加             | お願い plz summon s                         | @hanako お願い                                         |
| VC離脱             | さようなら bye b                            | @hanako bye                                            |
| 文字数制限         | 制限 limit readlimit                        | @hanako limit 20                                       |
| 教育（辞書機能）   | 教育 teach mk wbook-add                     | @hanako 教育 HIKAKIN ヒカキン                          |
| 忘却（辞書機能）   | 忘却 forget rm wbook-delete                 | @hanako 忘却 SEIKIN                                    |
| 辞書全削除         | 白紙 alldelete wbook-alldel                 | @hanako alldelete                                      |
| 辞書一覧           | 辞書 dictionary dic wbook-list              | @hanako dictionary                                     |
| 読上の中止         | 成敗 seibai stop                            | @hanako seibai                                         |
| SEの追加           | 音声教育 se-add                             | @hanako se-add （泣く） https://...(音声ファイルのURL) |
| SEの削除           | 音声忘却 se-delete se-del                   | @hanako se-del :seikin-osusume:                        |
| SEの一覧           | 音声辞書 音声一覧 se-dictionary se-dic se-list | @hanako se-list                                     |
| SEの検索           | se?                                         | @hanako se? 泣                                         |
| SEの名前変更       | 音声名置換 se-rename                        | @hanako se-rename （泣く） （号泣）                    |
| ブラックリスト追加 | 沈黙 blacklist-add                          | @hanako blacklist-add @seikin                          |
| ブラックリスト除外 | 恩赦 blacklist-remove                       | @hanako blacklist-remove @hikakin                      |
| ブラックリスト一覧 | 名簿 blacklist-show                         | @hanako blacklist-show                                 |
| ブラックリスト全削除 | 大赦 blacklist-clear                      | @hanako blacklist-clear                                |
| 読み上げキャラ変更 | キャラクター変更 speaker                    | @hanako speaker kiritan                                |
| ヘルプ             | 使い方 help                                 | @hanako help                                           |
| 質問               | 質問 ask                                    | @hanako ask 今日は晴れ？                               |

## ボイスチャットへの参加、退出
参加させたいボイスチャットに参加し、読み上げたいテキストチャンネルに`@hanako plz` と発言(または、`summon` `s`)
`@hanako bye`(または、`bye` `b` ) で退出
ボイスチャンネルにはなこだけが残った場合、自動的に退出します

## 単語の教育
ボイスチャットにはなこを参加させた状態で `@hanako teach 置換前の単語 置換後の単語` と発言
`@hanako forget 置換前の単語` と発言し削除
`@hanako alldelete --force` ですべての単語を削除（`--force`フラグが必要）
`@hanako dictionary` で教育済みの単語の一覧を表示（ページ送り対応）

* 単語は2〜50文字、サーバごとに最大200件まで登録可能
* 登録された単語はTTS合成前にテキスト置換されます

## 読み上げる文字数の制限
`@hanako limit 30`で読み上げる文字数を30文字に制限
`@hanako limit 0`で制限を解除（デフォルト: 無制限）

## SE機能
チャット中の特定の単語が読み上げられる代わりに、登録した音声ファイルを再生します

**SE追加の3つの方法:**
1. URL指定: `@hanako se-add キーワード https://example.com/sound.mp3`
2. ファイル添付（単一）: `@hanako se-add キーワード` + Discordにファイルを添付
3. ファイル添付（複数）: `@hanako se-add` + 複数ファイルを添付（ファイル名がキーワードになる）

`@hanako se-del SE化した単語` でSEを解除（スペース区切りで複数同時削除可能）
`@hanako se-list` でSEの一覧を表示（ページ送り対応）
`@hanako se? キーワード` であいまい検索（上位5件を表示）
`@hanako se-rename 旧キーワード 新キーワード` でキーワードを変更

* 対応形式: `.wav` `.mp3`
* キーワードは2〜50文字、サーバごとに最大10,000件まで登録可能
* ファイルサイズ上限: 2MB、再生時間上限: 60秒

## ブラックリスト（ユーザのミュート）
ボイスチャットにはなこを参加させた状態で `@hanako blacklist-add @username` と発言、@usernameの発言は読まれなくなる
`@hanako blacklist-remove @username` で解除
`@hanako blacklist-show` でミュート中のユーザの一覧を表示
`@hanako blacklist-clear --force` で全ミュートを解除（`--force`フラグが必要）

## 成敗
`@hanako seibai` で現在読み上げ中の音声（とそれ以降に読み上げる予定の音声）をすべて中断する

## 読み上げキャラクター変更
`@hanako speaker キャラクター名` で音声サーバの設定に従って、サーバの読み上げキャラクターを変更する
`@hanako speaker default` でデフォルトキャラクターに戻す

## サーバごとの独立管理
辞書・SE・ブラックリスト・設定はすべてDiscordサーバ（ギルド）ごとに独立して管理されます

# Dependencies

## Node.js Runtime
* Node.js 24.11.1
* npm (latest compatible version)

## System Dependencies
* **FFmpeg**: オーディオ形式変換・処理 (ffmpeg-staticに含まれる)
* Windows x64環境ではprebuiltバイナリを同梱しているため、C++ Build Tools・CMake・libsamplerateのインストールは不要です

## Discord Integration
* Discord Bot Token
* Discord Client ID (スラッシュコマンド用)
* Discord Guild ID (スラッシュコマンドデプロイ用)
* インターネット接続

## Audio Service
* **Ebyroid Audio Server** (推奨):
  * VoiceroidがインストールされたWindowsマシン
  * 有効なVoiceroidライセンス
  * デフォルトポート: 4090
* または `GET /api/v1/audiostream?text=&name=` でaudio/wavを返すHTTP APIサーバ

## Special Dependencies
* **node-libsamplerate**: ローカルカスタム依存関係 (`vendor/node-libsamplerate-prebuilt`)
  * libsamplerateのnativeバインディング
  * Windows x64向けprebuiltバイナリを同梱済み

# Install
## 0.前提条件
* **Node.js 24.11.1** — [Volta](https://volta.sh/)を使用している場合、`package.json`の設定により自動的にバージョンが固定されます
* **Windows x64** — prebuiltバイナリを同梱しているため、そのまま動作します

## 1.BOTの作成
Discord Developer Portalよりアプリケーションを作成し、ボットのTOKENとCLIENT_IDを取得する必要があります
参考: https://discordpy.readthedocs.io/ja/latest/discord.html#discord-intro

**必要なBot権限:**
* Send Messages
* Embed Links
* Read Message History
* Add Reactions
* Connect (Voice)
* Speak (Voice)

**必要なPrivileged Gateway Intents:**
* Message Content Intent（テキストコマンドの読み取りに必要）

## 2.音声サーバの設定
標準の機能では、HTTPリクエストによる `GET /api/v1/audiostream?text=読み上げテキスト&name=キャラクター名` に対して、audio/wavにてストリームを返答する形式のオーディオサーバを任意にTTSの為に利用可能です

Ebyroidは、VoiceroidがインストールされたWindowsマシンを音声サーバとして利用可能にするために最適なアプリケーションです。  
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

hanakoディレクトリの`app-config-default.yml`をコピーし、`app-config.yml`にリネームし、以下の3項目を設定します

```
  # Discord Bot のトークン (必ず app-config.yml でオーバーライドしてください)
  discord_bot_token: 'nYank0Daisk1......'

  # Discord Bot のCLIENT_ID (必ず app-config.yml でオーバーライドしてください)
  discord_client_id: '<YOUR DISCORD CLIENT_ID HERE>'

  # スラッシュコマンドを適用するGUILD_ID (必ず app-config.yml でオーバーライドしてください)
  discord_guild_id: '<YOUR DISCORD GUILD_ID HERE>'
```

## 4.スラッシュコマンドの登録
初回起動前、またはスラッシュコマンドの定義を更新した際に実行します
```
node deploy-commands.js
```

## 5.起動
```
node index
```

デバッグモードで起動する場合:
```
npm run debug
```

# Architecture
## 技術スタック
| カテゴリ | 技術 |
|----------|------|
| Runtime | Node.js 24.11.1 |
| Discord | discord.js 14, @discordjs/voice, @discordjs/opus |
| Database | NeDB (組み込みドキュメントDB) |
| Audio | prism-media, ffmpeg-static, node-libsamplerate |
| Logging | log4js (ファイルローテーション付き) |
| Config | YAML (app-config-default.yml + app-config.yml) |

## プロジェクト構成
```
src/
├── app/          # コントローラ層 — Discordイベントハンドラ・ミドルウェア
├── domain/       # ドメイン層
│   ├── model/    #   コマンドクラス (20種) ・ボットモデル
│   ├── entity/   #   イミュータブルなドメインエンティティ・レスポンス・アクション
│   └── repo/     #   リポジトリインターフェース (契約)
├── infra/        # インフラ層 — Discord/NeDB/Ebyroid/ファイルストレージの実装
├── service/      # サービス層 — メッセージルーティング・レスポンスハンドリング
├── core/         # DI コンテナ・設定ローダー・ユーティリティ
└── library/      # 共有ライブラリ — ストリーム変換
```

## 設計パターン
* **Dependency Injection** — `app-config.yml`でインターフェースと実装のバインディングを定義
* **Repository Pattern** — ドメイン層はインターフェースのみに依存し、NeDB等の実装はインフラ層に配置
* **Command Pattern** — 各コマンドは独立したクラスで、`process(input)`メソッドを持つ

## データストレージ
サーバごとに独立したデータが`./db/`ディレクトリに永続化されます

| ファイル | 内容 |
|----------|------|
| teach.db | 単語辞書 |
| soundeffect.db | SE辞書メタデータ |
| blacklist.db | ブラックリスト |
| settings.db | サーバごとの設定（文字数制限・キャラクター） |
| files.db | ダウンロード済みSEファイルの管理 |
| recovery.db | リカバリ情報 |

SEの音声ファイルは`./files/`ディレクトリにキャッシュされます

# VS.
喋太郎: https://twitter.com/syabetaro - More cute voice

# Catgirl
![img20200222233956](https://user-images.githubusercontent.com/18446038/75094313-4a370d80-55cd-11ea-9af1-71cec1bf1d20.png)

彼女は凜々しい白猫でしたが、ある日降り積もるソメイヨシノを枕に眠りについたのち桃色に染まりました

She was a polished white cat, but one day she put on asleep on a pillow with a pile of pink plant petals. Then was painted peach color.

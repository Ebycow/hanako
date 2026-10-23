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

| 機能 | コマンド | スラッシュコマンド | 必要な権限 | 例 |
|---|---|---|---|---|
| VC参加 | お願い plz summon s | /plz | - | @hanako お願い |
| VC離脱 | さようなら bye b | /bye | - | @hanako bye |
| 文字数制限 | 制限 limit readlimit | /limit | サーバー管理 | @hanako limit 20 |
| 教育（辞書機能） | 教育 teach mk wbook-add | /teach | - | @hanako 教育 HIKAKIN ヒカキン |
| 忘却（辞書機能） | 忘却 forget rm wbook-delete | /forget | - | @hanako 忘却 SEIKIN |
| 辞書全削除 | 白紙 alldelete wbook-alldel | /dictionary-clear | サーバー管理 | @hanako alldelete --force |
| 辞書一覧 | 辞書 dictionary dic wbook-list | /dictionary | - | @hanako dictionary |
| 読上の中止 | 成敗 seibai stop | /seibai | - | @hanako seibai |
| SEの追加 | 音声教育 se-add | /se-add | - | @hanako se-add （泣く） https://...(音声ファイルのURL) |
| SEの削除 | 音声忘却 se-delete se-del | /se-del | - | @hanako se-del :seikin-osusume: |
| SEの一覧 | 音声辞書 音声一覧 se-dictionary se-dic se-list | /se-list | - | @hanako se-list |
| SEの検索 | se? | /se-search | - | @hanako se? 泣 |
| SEの名前変更 | 音声名置換 se-rename | /se-rename | - | @hanako se-rename （泣く） （号泣） |
| SE正規化 | SE正規化 se-normalize senorm | /se-normalize | サーバー管理 | @hanako se-normalize 80 |
| ブラックリスト追加 | 沈黙 blacklist-add | /blacklist-add | メンバーをタイムアウト | @hanako blacklist-add @seikin |
| ブラックリスト除外 | 恩赦 blacklist-remove | /blacklist-remove | メンバーをタイムアウト | @hanako blacklist-remove @hikakin |
| ブラックリスト一覧 | 名簿 blacklist-show | /blacklist-show | メンバーをタイムアウト | @hanako blacklist-show |
| ブラックリスト全削除 | 大赦 blacklist-clear | /blacklist-clear | サーバー管理 | @hanako blacklist-clear --force |
| 読み上げキャラ変更 | キャラクター変更 speaker | /speaker | - | @hanako speaker kiritan |
| 読み上げキャラ一覧 | キャラクター一覧 speakers | /speakers | - | @hanako speakers |
| ヘルプ | 使い方 help | /help | - | @hanako help limit |
| 質問 | 質問 ask | /ask | - | @hanako ask 今日は晴れ？ |
| テキストコマンドの有効・無効 | （スラッシュコマンドのみ） | /text-commands | サーバー管理 | /text-commands enabled:False |

### コマンドを使える人
「必要な権限」が `-` のコマンドは誰でも使えます。それ以外は、その権限（または管理者権限）を持つ人だけが使えます。

* スラッシュコマンドでは、これは使える人の初期値です。サーバー管理者は「サーバー設定 → 連携サービス → はなこ」から、コマンドごとに使えるロール・メンバー・チャンネルを変更できます（例: ブラックリストを全員が使えるようにする）
* テキスト（`@hanako` や `>`）で実行したときは、この表の権限を持っているかで判断します。連携サービスでの変更はテキストには反映されません
  * 連携サービスで使える人を初期値より広げた場合はテキストの方が厳しく、特定のロールやチャンネルに限定するなど狭めた場合はテキストの方が緩くなります

### テキストコマンドを使わないようにする
`/text-commands enabled:False` で、そのサーバーでは `@hanako` や `>` で始まるテキストのコマンドを実行しなくなります（`/text-commands enabled:True` で元に戻ります）
連携サービスで使える人を細かく決めたいサーバーや、`>` を他のBotのために空けたいサーバー向けです

* 無効にしている間、テキストのコマンドは案内も返さずに無視します
* `>` で始まる発言は、これまでどおり読み上げません

## ボイスチャットへの参加、退出
参加させたいボイスチャットに参加し、読み上げたいテキストチャンネルに`@hanako plz` と発言(または、`summon` `s`)
`@hanako bye`(または、`bye` `b` ) で退出
ボイスチャンネルにはなこだけが残った場合、自動的に退出します

## 単語の教育
ボイスチャットにはなこを参加させた状態で `@hanako teach 置換前の単語 置換後の単語` と発言
`@hanako forget 置換前の単語` と発言し削除
`@hanako alldelete --force` ですべての単語を削除（`--force`フラグが必要）
`@hanako dictionary` で教育済みの単語の一覧を表示（ページ送り対応）

* 単語は2〜50文字、サーバごとに最大10,000件まで登録可能
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
* 保存容量はサーバごとに3GBまで（`foley_max_storage_byte_size`）。超えると新しいSEを登録できない（登録済みのSEは消さない）

**SE音量正規化:**
`@hanako se-normalize 80` でSEの音量を正規化するレベルを設定します（0〜100）
デフォルト値はグローバル設定（`foley_normalize_target_peak`）から決まります（未設定時は50%）
音量が小さいSEファイルを指定したレベルまで持ち上げることで、再生時の音量バランスを改善します
`@hanako se-normalize 0` で正規化を無効化できます

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

音声サーバに [ttshub](https://github.com/Ebycow/ttshub)（複数の音声エンジンを束ねるゲートウェイ）を使っている場合（`TTSHUB_URL` を設定した場合）は、次のこともできます
* `/speaker` の入力中にキャラクターの候補が出る
* `@hanako speaker ずんだもん あまあま` のようにあいまいに書いても、一番近いキャラクターに変更する。見つからなければ候補を案内する
* `voicevox:ずんだもん/あまあま?speed=1.2` のように、話す速さなどを指定できる
* `@hanako speakers`（`/speakers`）でキャラクターの一覧を表示する

## 使い方を見る
`@hanako help`（`/help`）でコマンドの一覧を表示する
`@hanako help limit`（`/help command:limit`）で、そのコマンドのオプション・使える人・テキストでの書き方を表示する。コマンド名はスラッシュコマンドの名前でも、`制限` のようなテキストでの名前でもよい

どちらも最後に使い方のページ（`help_url` の設定。既定はこの README）を案内する。自分で運用している花子で独自の説明ページを用意しているなら、`app-config.yml` の `help_url` か環境変数 `HELP_URL` でその URL に変えられる（空にすると案内しない）

## サーバごとの独立管理
辞書・SE・ブラックリスト・設定はすべてDiscordサーバ（ギルド）ごとに独立して管理されます

# Dependencies

## Node.js Runtime
* Node.js 24.21.0
* npm (latest compatible version)

## System Dependencies
* **FFmpeg**: オーディオ形式変換・処理 (ffmpeg-staticに含まれる。取得できなかった場合はPATH上の`ffmpeg`を使う)
* ネイティブモジュールのビルドは不要です（C++ Build Tools・CMake・Pythonのインストールは不要）

## Discord Integration
* Discord Bot Token
* Discord Client ID (スラッシュコマンド用)
* Discord Guild ID (スラッシュコマンドデプロイ用)
* インターネット接続

## Audio Service
はなこは音声を作らず、別に動かす音声サーバに作らせます。次の3つの構成から選びます（詳しい手順は [2.音声サーバの設定](#2音声サーバの設定)）

| 構成 | はなこの設定 | 必要な音声サーバ |
|---|---|---|
| A. Ebyroid に直接（従来） | `EBYROID_STREAM_API_URL` に `/api/v1/audiostream` | [nanokina/ebyroid](https://github.com/nanokina/ebyroid)（配布されている `ebyroid.exe`）または [Ebycow/ebyroid](https://github.com/Ebycow/ebyroid) |
| B. Ebyroid に直接（ストリーミング） | `EBYROID_STREAM_API_URL` に `/api/v2/audiostream` | [Ebycow/ebyroid](https://github.com/Ebycow/ebyroid) |
| C. ttshub 経由 | `TTSHUB_URL` | [Ebycow/ttshub](https://github.com/Ebycow/ttshub) と、その先のエンジン（VOICEROID を使うなら [Ebycow/ebyroid](https://github.com/Ebycow/ebyroid)、VOICEVOX など） |

* Ebycow/ebyroid は nanokina/ebyroid のフォークで、ストリーミング（`POST /api/v2/audiostream`）、話者一覧（`GET /api/v1/voices`）、稼働確認（`GET /api/v1/health`）、話者ごとのワーカー、Linux（wine）+ Docker Compose での動作を加えたものです。従来の API もそのまま使えるため、A の構成でも置き換えられます
* VOICEROID を使うには、有効なライセンスを持つ VOICEROID+ / VOICEROID2 のライブラリが必要です
* 自作の音声サーバを使う場合は、`POST /api/v2/audiostream`（JSON body、chunked raw PCM）か `GET /api/v1/audiostream?text=&name=` を Ebyroid と同じ形で提供します

## Special Dependencies
* **@alexanderolsen/libsamplerate-js**: 音声のサンプリングレート変換
  * libsamplerateのWebAssembly版のため、OSやCPUを問わず動作します

# Install
## 0.前提条件
* **Node.js 24.21.0** — [Volta](https://volta.sh/)を使用している場合、`package.json`の設定により自動的にバージョンが固定されます
* **Windows / Linux / macOS**（x64・arm64）— Dockerで動かす場合は [Docker で一発で動かす](#docker-で一発で動かすおすすめ) を参照

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

## Docker で一発で動かす（おすすめ）
はなこ・[ttshub](https://github.com/Ebycow/ttshub)・VOICEVOX をまとめて起動します（[Audio Service](#audio-service) の C の構成）。イメージは GHCR に公開しているものを使うので、ビルドや clone は要りません。Docker と Docker Compose（v2.23 以降）があれば動きます

```
mkdir hanako && cd hanako
curl -fsSLO https://raw.githubusercontent.com/Ebycow/hanako/master/quickstart/compose.yaml
curl -fsSL -o .env https://raw.githubusercontent.com/Ebycow/hanako/master/quickstart/.env.example
# .env に DISCORD_BOT_TOKEN と DISCORD_CLIENT_ID を書く
docker compose up -d
```

* スラッシュコマンドは起動のたびに登録します。前回から変わっていなければ Discord には送りません
* VOICEVOX のすべてのキャラクターを使えます。キャラクターを指定していないサーバはずんだもんで読み上げます（`.env` の `DEFAULT_VOICE` で変えられます）。VOICEVOX のキャラクターはそれぞれの利用規約に従って使ってください（`/speaker` で変えたときに、クレジットと規約のリンクを表示します）
* ttshub はホストにポートを公開せず、compose の中だけではなこにつなぎます
* 新しい版にするときは `docker compose pull && docker compose up -d`。ログは `docker compose logs -f hanako` で見られます
* 辞書・SE などのデータは Docker のボリュームに保存され、コンテナを作り直しても残ります

**VOICEROID も使う場合**（x64 のみ）

VOICEROID のライブラリは各自のライセンスで用意し、同じディレクトリに置きます（イメージには含まれません）

```
# Windows の C:\Program Files (x86)\AHS\VOICEROID+ を、compose.yaml と同じディレクトリの AHS/VOICEROID+ にコピーする
curl -fsSL -o ebyroid.conf.json https://raw.githubusercontent.com/Ebycow/hanako/master/quickstart/ebyroid.conf.example.json
# ebyroid.conf.json に、使う声を書く
# .env の COMPOSE_PROFILES=voiceroid を有効にする
docker compose up -d
```

* `ebyroid.conf.json` の `baseDirPath` は `Z:\\voiceroid\\<AHS/VOICEROID+ の中のフォルダ名>` と書きます。書き方は [Ebycow/ebyroid の README](https://github.com/Ebycow/ebyroid#docker-linux--wine) を参照してください
* `/speaker ebyroid:kiritan` のように、`ebyroid:` に続けて `ebyroid.conf.json` の `name` で指定します

**ttshub の設定を変える場合**

ttshub の設定（エンジン、別名、プリセットなど）は `compose.yaml` の末尾の `configs` に書いてあります。AivisSpeech などを足すときはそこを書き換えます。項目は [ttshub の README](https://github.com/Ebycow/ttshub#設定) を参照してください

## 2.音声サーバの設定
ここからは、[Docker で一発で動かす](#docker-で一発で動かすおすすめ) を使わずに、音声サーバとはなこを自分で組み合わせる場合の手順です

[Audio Service](#audio-service) の A〜C のどれで動かすかを決め、はなこより先に音声サーバを起動しておきます

| | A. Ebyroid（従来） | B. Ebyroid（ストリーミング） | C. ttshub 経由 |
|---|---|---|---|
| Ebyroid | nanokina 版・Ebycow 版のどちらでもよい | Ebycow 版が必要 | VOICEROID を使うなら Ebycow 版が必要 |
| 音声が流れ始めるまで | 1文を作り終えてから | 作っている途中から | 作っている途中から（エンジンによる） |
| 発言内容 | URL のクエリに載る | リクエストの本文に載る | リクエストの本文に載る |
| 使える声 | VOICEROID | VOICEROID | VOICEROID、VOICEVOX、AivisSpeech など |
| `/speaker` の候補・`/speakers` | なし | なし | あり |

### Ebyroid を用意する（VOICEROID を使う場合）
Ebyroid は VOICEROID を HTTP の音声サーバにするアプリケーションです。既定では 4090 番ポートで待ち受け、はなこの既定の接続先もこれに合わせています

**A の構成で、Windows で動かす場合（nanokina 版）**

[nanokina/ebyroid の Releases](https://github.com/nanokina/ebyroid/releases) から `ebyroid-v*.zip` を取得して展開し、VOICEROID が入った Windows で起動します

```
C:\ebyroid> ebyroid.exe configure
C:\ebyroid> ebyroid.exe start
```

**B・C の構成で使う場合（Ebycow 版）**

Linux（wine）なら Docker Compose で動かせます。VOICEROID は Windows から `C:\Program Files (x86)\AHS` をコピーして使います（compose は VOICEROID+ を想定しています）

```
git clone https://github.com/Ebycow/ebyroid.git
cd ebyroid
# Windows の C:\Program Files (x86)\AHS を、このディレクトリの AHS/ にコピーする（git の管理外）
cp docker/ebyroid.conf.example.json docker/ebyroid.conf.json
docker compose up -d --build
```

* `docker/ebyroid.conf.json` に使う話者を並べます。`AHS/VOICEROID+` はコンテナの `Z:\voiceroid` に見えるため、`baseDirPath` は `Z:\\voiceroid\\KiritanEX` のように書きます
* `curl http://localhost:4090/api/v1/voices` で、設定した話者の一覧が返れば動いています
* ポート、ワーカー数などの設定は [Ebycow/ebyroid の README](https://github.com/Ebycow/ebyroid#docker-linux--wine) を参照してください。Ebycow 版は配布用の `ebyroid.exe` を用意していないため、Windows で動かす場合はソースからビルドします（必要なものは同じ README の Requirements を参照）

### A・B: はなこを Ebyroid に直接つなぐ
接続先を `app-config.yml` の `ebyroid_stream_api_url`（または環境変数 `EBYROID_STREAM_API_URL`）に書きます。URL のパスで使う API が決まります

```yaml
settings:
  # A: 従来の API（nanokina 版・Ebycow 版）
  ebyroid_stream_api_url: 'http://localhost:4090/api/v1/audiostream'
  # B: ストリーミング（Ebycow 版のみ）
  # ebyroid_stream_api_url: 'http://localhost:4090/api/v2/audiostream'
```

`ebyroid_stream_api_mode`（`EBYROID_STREAM_API_MODE`）は既定の `auto` のままで、URL が `/api/v2/audiostream` ならストリーミング、それ以外なら従来の API を使います。URL と別に固定したいときだけ `streaming-post` / `legacy-get` を指定します

`/speaker` で指定するキャラクター名は、Ebyroid の設定にある話者の `name`（例: `kiritan`）です

### C: はなこを ttshub につなぐ
[ttshub](https://github.com/Ebycow/ttshub) は、VOICEROID（Ebyroid）や VOICEVOX などの複数のエンジンを1つの API にまとめるゲートウェイです。ttshub の Docker Compose は Ebyroid を一緒に起動できます。そのとき `../ebyroid/compose.yaml` を読むので、2つのリポジトリを同じディレクトリに並べて置きます

```
git clone https://github.com/Ebycow/ebyroid.git
git clone https://github.com/Ebycow/ttshub.git
# ebyroid の準備をする（上の「Ebycow 版」の手順のうち、docker compose up の前まで）
cd ttshub
cp ttshub.example.yaml ttshub.yaml
docker compose --profile ebyroid --profile voicevox up -d
```

* `ttshub.yaml` の `engines` で使うエンジンを決めます。例のファイルは VOICEVOX が有効で、ebyroid はコメントになっているので、使うものを有効にし、使わないものは消します（`default_voice` も使うエンジンの声にします）
* `--profile` は compose で一緒に起動するエンジンです。VOICEROID だけなら `--profile ebyroid`、VOICEVOX だけなら `--profile voicevox`、エンジンを別に動かしているなら付けません
  * Ebyroid を ebyroid のディレクトリで別に起動している場合は `--profile ebyroid` を付けず、`ttshub.yaml` の ebyroid の `backends` を `http://host.docker.internal:4090` にします（両方で起動するとポートがぶつかります）
* VOICEVOX などだけで VOICEROID を使わないなら、Ebyroid は不要です
* はなこは ttshub に鍵（`Authorization`）を送りません。`ttshub.yaml` の `clients` は書かず、ttshub のポート（8790）はインターネットに公開しないでください
* `curl -G localhost:8790/v1/voices/resolve --data-urlencode q=kiritan` で、話者が見つかれば動いています

はなこの `app-config.yml` の `ttshub_url`（または環境変数 `TTSHUB_URL`）に ttshub の URL を書きます。設定すると、`ebyroid_stream_api_url` は使わずに ttshub で読み上げます

```yaml
settings:
  ttshub_url: 'http://localhost:8790'
```

`/speaker` では `voicevox:ずんだもん/あまあま` のような ttshub のアドレスや、あいまいな名前でキャラクターを指定します（[読み上げキャラクター変更](#読み上げキャラクター変更)）。ttshub の設定は [ttshub の README](https://github.com/Ebycow/ttshub) を参照してください

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

  # （任意）以前ギルド単位でスラッシュコマンドを登録していたGUILD_ID
  discord_guild_id: ''
```

## 4.スラッシュコマンドの登録
初回起動前、またはスラッシュコマンドの定義を更新した際に実行します
スラッシュコマンドはグローバル登録され、Botを導入したすべてのサーバーで使えます（サーバー内でのみ利用可能で、DMからは使えません）
`discord_guild_id` を指定している場合は、そのギルドに以前登録したスラッシュコマンドを削除して二重表示を防ぎます
```
node deploy-commands.js
```
登録する内容（コマンドごとの使える人の初期値など）が表で表示されます。登録せずに表だけ確認したいときは `node deploy-commands.js --dry-run` を実行します

## 5.起動
```
node index
```

デバッグモードで起動する場合:
```
npm run debug
```

## Docker Composeで動かす（音声サーバを自分で用意する場合）
リポジトリ直下の `compose.yaml` は、はなこだけを動かします。音声サーバ（Ebyroid や ttshub）は [2.音声サーバの設定](#2音声サーバの設定) の手順で別に起動しておきます

`.env.example` をコピーして `.env` を作り、トークンなどを設定します
```
cp .env.example .env
```

| 環境変数 | 内容 |
|---|---|
| `DISCORD_BOT_TOKEN` | Discord Botのトークン（必須） |
| `DISCORD_CLIENT_ID` | Discord BotのCLIENT_ID（必須） |
| `DISCORD_GUILD_ID` | （任意）以前ギルド単位でスラッシュコマンドを登録していたGUILD_ID |
| `EBYROID_STREAM_API_URL` | （A・B）Ebyroid のURL。同じマシンなら `host.docker.internal`、別のマシンならそのIPアドレスを書く。ストリーミング（B、Ebycow 版のみ）なら `/api/v2/audiostream` |
| `EBYROID_STREAM_API_MODE` | （任意）`auto` / `legacy-get` / `streaming-post` |
| `TTSHUB_URL` | （C）ttshub のURL（例: `http://host.docker.internal:8790`）。設定すると `EBYROID_STREAM_API_URL` は使わない |
| `HELP_URL` | （任意）help コマンドで案内する使い方のページのURL。省略するとこの README を案内する |

これらの環境変数は、Dockerを使わない場合も `app-config.yml` より優先されます

スラッシュコマンドを登録してから起動します
```
docker compose run --rm hanako node deploy-commands.js
docker compose up -d --build
```

`node deploy-commands.js --if-changed` にすると、前回登録した内容と同じときは Discord に送りません（登録した内容は `db/slash-commands.sha256` に記録します）

ログは `docker compose logs -f hanako` で確認できます。辞書・SEなどのデータはDockerのボリューム（`db`・`files`・`log`）に保存され、コンテナを作り直しても残ります

それ以外の設定を変えるときは、`app-config.yml` を作ってから `compose.yaml` の `./app-config.yml` の行を有効にします

**既存のデータを移す場合:** 一度 `docker compose up -d` でコンテナを作ってから、次のようにコピーして再起動します
```
docker compose stop
docker compose cp ./db/. hanako:/app/db
docker compose cp ./files/. hanako:/app/files
docker compose run --rm --user root hanako chown -R node:node /app/db /app/files
docker compose start
```

### 本番と開発を同じマシンで動かす
本番のチェックアウトは編集せず、git で更新するだけにします。開発は `git worktree` で作った別のディレクトリで行います。Composeのプロジェクト名はディレクトリ名になるため、コンテナとボリューム（辞書・SEなど）は本番と開発で自動的に分かれます

```
git worktree add ../hanako-dev -b <作業ブランチ> origin/master   # 開発用のディレクトリを作る
cd ../hanako-dev
cp .env.example .env    # 開発用Botのトークンを書く。HANAKO_TAG は dev のまま
docker compose run --rm hanako node deploy-commands.js
docker compose up -d --build
```

本番の `.env` には `HANAKO_TAG=latest` を書きます。開発では既定の `dev` タグのままにして、本番のイメージを上書きしないようにします

本番へは、本番のチェックアウトで `deploy.sh` を実行して出します。CI が master のコミットごとに GHCR に公開したイメージ（`ghcr.io/ebycow/hanako:<コミット ID>`）を取得し、出すコミットをチェックアウトし（ブランチには固定せず detached HEAD で指します）、スラッシュコマンドの登録（変わったときだけ）、起動を行い、healthy になるまで待ちます。失敗したら前のコミットとイメージに戻します
```
./deploy.sh                  # origin/master の内容を出す（マージ直後で CI がまだ公開していなければ待つ）
./deploy.sh <コミット ID>    # 指定したコミットの内容を出す（戻すときなど）
BUILD=1 ./deploy.sh <ref>    # master に入っていないコミットを、ここでビルドして出す
```

Docker 化より前のコミット（`compose.yaml` などがないもの）は出せません。指定するとなにもせずに止まります

# Architecture
## 技術スタック
| カテゴリ | 技術 |
|----------|------|
| Runtime | Node.js 24.21.0 |
| Discord | discord.js 14, @discordjs/voice, opusscript |
| Database | NeDB (組み込みドキュメントDB) |
| Audio | prism-media, ffmpeg-static, libsamplerate-js (WebAssembly) |
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
├── infra/        # インフラ層 — Discord/NeDB/Ebyroid/ttshub/ファイルストレージの実装
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

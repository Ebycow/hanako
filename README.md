# Hanako
汎用Discordチャット読み上げ(TTS)Bot  
強力なSE機能、ユーザーごとの音声切り替えに対応、複数サーバで高速に動作😼  
PC（x64）でも Raspberry Pi などの arm64 でも、`docker compose up` だけで動きます😻（[Docker で一発で動かす](#docker-で一発で動かすおすすめ)）

# 使い方
## はなことの対話
はなこにコマンド入力してあげると、様々な機能を利用できる  
コマンド入力は、テキストチャンネルに`@botname コマンド名` のリプライ形式、もしくは `>コマンド名`と発言することで行う。
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

# はじめかた
はなこを動かすには、Discord の Bot と、声を作る音声サーバが要ります。[Discord の Bot を作る](#discord-の-bot-を作る) を済ませたら、[Docker で一発で動かす](#docker-で一発で動かすおすすめ) で音声サーバごとまとめて起動するのがかんたんです

## Discord の Bot を作る
1. [Discord Developer Portal](https://discord.com/developers/applications) を開き、「New Application」でアプリケーションを作ります。名前が Bot の名前になります
2. 「一般情報」の **アプリID** を控えます。これが `DISCORD_CLIENT_ID` です
3. 「Bot」の「トークンをリセット」でトークンを作って控えます。これが `DISCORD_BOT_TOKEN` です。トークンはAIや他人に見せないでください（漏れたらもう一度 トークンをリセット します）
4. 同じ「Bot」の「Privileged Gateway Intents」で **Message Content Intent** をオンにして保存します。`@hanako` や `>` で始まるテキストのコマンドを読むのに要ります
5. 次の URL の `<CLIENT_ID>` を 2 で控えた ID に置き換えてブラウザで開き、はなこを入れるサーバを選びます

```
https://discord.com/oauth2/authorize?client_id=<CLIENT_ID>&scope=bot+applications.commands&permissions=3230784
```

`permissions=3230784` は、はなこが使う次の権限です

| 権限 | 使いみち |
|---|---|
| チャンネルを見る（View Channels） | 読み上げるチャンネルの発言を受け取る |
| メッセージを送信（Send Messages） | コマンドに返事をする |
| 埋め込みリンク（Embed Links） | 返事のリンクを埋め込みで表示する |
| メッセージ履歴を読む（Read Message History） | 一覧のページ送りのリアクションを付ける |
| リアクションの追加（Add Reactions） | 一覧のページ送りのリアクションを付ける |
| 接続（Connect） | ボイスチャンネルに参加する |
| 発言（Speak） | 読み上げる |

## Docker で一発で動かす（おすすめ）
はなこ・[ttshub](https://github.com/Ebycow/ttshub)（音声サーバ）・読み上げエンジンをまとめて起動します。Docker と Docker Compose（v2.23 以降）があれば、clone もビルドも要りません

```
mkdir hanako && cd hanako

curl -fsSLO https://raw.githubusercontent.com/Ebycow/hanako/master/quickstart/compose.yaml

# PC（x64）は VOICEVOX で読み上げる
curl -fsSL -o .env https://raw.githubusercontent.com/Ebycow/hanako/master/quickstart/.env.example

# .env に DISCORD_BOT_TOKEN と DISCORD_CLIENT_ID を書く
docker compose up -d
```

Raspberry Pi など（arm64）は、上の代わりにこちら。軽い Open JTalk で読み上げます。後述するVOICEROIDは、ラズパイで高速に動作するのでそちらもおすすめです
```
mkdir hanako && cd hanako

curl -fsSLO https://raw.githubusercontent.com/Ebycow/hanako/master/quickstart/compose.yaml

curl -fsSL -o .env https://raw.githubusercontent.com/Ebycow/hanako/master/quickstart/.env.pi.example

# .env に DISCORD_BOT_TOKEN と DISCORD_CLIENT_ID を書く
docker compose up -d
```

ボイスチャンネルに入って `/plz` と打てば、そのチャンネルの発言を読み上げます

* 新しい版にする: `docker compose pull && docker compose up -d`
* ログを見る: `docker compose logs -f hanako`
* 標準の声や、一緒に起動するエンジンは `.env` で変えられます（書き方は `.env` のコメントを参照）
* 声のキャラクターは、それぞれの利用規約に従って使ってください。`/speaker` で変えたときに、クレジットと規約のリンクを表示します

### VOICEROID も使う場合
VOICEROID のライブラリは各自のライセンスで用意します（イメージには含まれません）

```
# Windows の C:\Program Files (x86)\AHS\VOICEROID+ を、compose.yaml と同じディレクトリの AHS/VOICEROID+ にコピーする
curl -fsSL -o ebyroid.conf.json https://raw.githubusercontent.com/Ebycow/hanako/master/quickstart/ebyroid.conf.example.json
# ebyroid.conf.json に使う声を書き、.env の COMPOSE_PROFILES に voiceroid を足す
docker compose up -d
```

* `ebyroid.conf.json` の書き方は [Ebycow/ebyroid の README](https://github.com/Ebycow/ebyroid#docker-linux--wine) を参照してください。arm64 で動かすときの制約も [同じ README](https://github.com/Ebycow/ebyroid#raspberry-pi-linuxarm64) にあります
* `/speaker ebyroid:kiritan` のように、`ebyroid:` に続けて `ebyroid.conf.json` の `name` で指定します

### 音声サーバの設定を変える場合
ttshub の設定（エンジン、別名、プリセットなど）は `compose.yaml` の末尾の `configs` にあります。AivisSpeech などを足すときはそこを書き換えます。項目は [ttshub の README](https://github.com/Ebycow/ttshub#設定) を参照してください

## 自分で組み合わせて動かす
[Docker で一発で動かす](#docker-で一発で動かすおすすめ) を使わずに、音声サーバとはなこを別々に用意する手順です。音声サーバを先に起動しておきます

### 音声サーバを用意する
はなこは自分では声を作らず、音声サーバに作らせます

**ttshub（おすすめ）**

[ttshub](https://github.com/Ebycow/ttshub) は、いくつもの読み上げエンジンを 1 つにまとめる音声サーバです。VOICEVOX・AivisSpeech・Open JTalk などでしゃべれて、`/speaker` の入力候補やあいまいな指定、`/speakers` の一覧もこの構成で使えます。起動の手順とエンジンの設定は [ttshub の README](https://github.com/Ebycow/ttshub#使い方) を参照してください

VOICEROID を使いたいときは、[Ebycow/ebyroid](https://github.com/Ebycow/ebyroid) を ttshub のエンジンに加えます。Ebyroid は VOICEROID を音声サーバにするもので、Linux の Docker で動き、arm64（Raspberry Pi 4 など）にも対応しています。準備は [Ebycow/ebyroid の README](https://github.com/Ebycow/ebyroid#docker-linux--wine) を参照してください（VOICEROID のライブラリは各自のライセンスで用意します）

はなこの `app-config.yml` の `ttshub_url`（または環境変数 `TTSHUB_URL`）に ttshub の URL を書きます

```yaml
settings:
  ttshub_url: 'http://localhost:8790'
```

はなこは ttshub に鍵（`Authorization`）を送りません。`ttshub.yaml` の `clients` は書かず、ttshub のポート（8790）はインターネットに公開しないでください

**Ebyroid に直接つなぐ（VOICEROID だけでよい場合）**

ttshub を挟まずに、VOICEROID だけで読み上げる軽い構成です。従来のはなこは、この直接つなぐ経路で動いていました。今はttshubがあるので、直接つなぐ方法はサポートされなくなるかもしれません。直接つなぐと、`/speaker` の入力候補やあいまいな指定、`/speakers` は使えません。[Ebycow/ebyroid](https://github.com/Ebycow/ebyroid#docker-linux--wine) を起動し、`ebyroid_stream_api_url`（または環境変数 `EBYROID_STREAM_API_URL`）にストリーミングの API を書きます。`ttshub_url` は空のままにします

```yaml
settings:
  ebyroid_stream_api_url: 'http://localhost:4090/api/v2/audiostream'
```

`/speaker` には Ebyroid の設定にある話者の `name`（例: `kiritan`）を指定します

* [nanokina/ebyroid](https://github.com/nanokina/ebyroid) の `ebyroid.exe` のように従来の API しかない音声サーバには、URL のパスを `/api/v1/audiostream` にしてつなぎます（音声は 1 文を作り終えてから流れます）
* 自作の音声サーバを使う場合は、`POST /api/v2/audiostream`（JSON の本文、chunked の raw PCM）か `GET /api/v1/audiostream?text=&name=` を Ebyroid と同じ形で用意します。Ebyroid と同じ API（`/api/v1/voices`・`/api/v2/audiostream`・`/api/v1/health`）にしておけば、ttshub の `ebyroid` プラグインでもつなげるので、こちらをおすすめします

### はなこを Docker Compose で動かす
リポジトリ直下の `compose.yaml` は、はなこだけを動かします

```
git clone https://github.com/Ebycow/hanako.git
cd hanako
cp .env.example .env    # トークンと音声サーバの URL を書く
docker compose run --rm hanako node deploy-commands.js   # スラッシュコマンドを登録する
docker compose up -d --build
```

| 環境変数 | 内容 |
|---|---|
| `DISCORD_BOT_TOKEN` | Discord Botのトークン（必須） |
| `DISCORD_CLIENT_ID` | Discord BotのCLIENT_ID（必須） |
| `TTSHUB_URL` | ttshub のURL（例: `http://host.docker.internal:8790`）。設定すると `EBYROID_STREAM_API_URL` は使わない |
| `EBYROID_STREAM_API_URL` | Ebyroid に直接つなぐときの URL（例: `http://host.docker.internal:4090/api/v2/audiostream`）。同じマシンなら `host.docker.internal`、別のマシンならその IP アドレスを書く |
| `EBYROID_STREAM_API_MODE` | （任意）`auto` / `legacy-get` / `streaming-post`。既定の `auto` は URL のパスで決める |
| `DISCORD_GUILD_ID` | （任意）以前ギルド単位でスラッシュコマンドを登録していたGUILD_ID |
| `HELP_URL` | （任意）help コマンドで案内する使い方のページのURL。省略するとこの README を案内する |

* これらの環境変数は、Docker を使わない場合も `app-config.yml` より優先されます。それ以外の設定を変えるときは、`app-config.yml` を作ってから `compose.yaml` の `./app-config.yml` の行を有効にします
* `node deploy-commands.js --if-changed` にすると、前回登録した内容と同じときは Discord に送りません

**既存のデータを移す場合:** 一度 `docker compose up -d` でコンテナを作ってから、次のようにコピーして再起動します
```
docker compose stop
docker compose cp ./db/. hanako:/app/db
docker compose cp ./files/. hanako:/app/files
docker compose run --rm --user root hanako chown -R node:node /app/db /app/files
docker compose start
```

### はなこを Node.js で動かす
Node.js 24.22.1 が要ります（[Volta](https://volta.sh/) を使っていれば、`package.json` の設定でこの版になります）。Windows / Linux / macOS の x64・arm64 で動きます。FFmpeg は npm の依存に含まれるので、別に入れる必要はありません

```
git clone https://github.com/Ebycow/hanako.git
cd hanako
npm i
cp app-config-default.yml app-config.yml
```

`app-config.yml` に、Bot のトークンと CLIENT_ID、音声サーバの URL（[音声サーバを用意する](#音声サーバを用意する)）を書きます

```yaml
settings:
  discord_bot_token: '<YOUR DISCORD BOT TOKEN HERE>'
  discord_client_id: '<YOUR DISCORD CLIENT_ID HERE>'
  ttshub_url: 'http://localhost:8790'
```

スラッシュコマンドを登録してから起動します

```
node deploy-commands.js
node index
```

* スラッシュコマンドの登録は、初回と、スラッシュコマンドの定義が変わったときに要ります。スラッシュコマンドはグローバルに登録され、Bot を入れたすべてのサーバで使えます（DM では使えません）
* `node deploy-commands.js --dry-run` で、登録せずに内容（コマンドごとの使える人の初期値など）を表で確かめられます
* `discord_guild_id` を指定すると、そのギルドに以前ギルド単位で登録したスラッシュコマンドを消して、二重に表示されるのを防ぎます
* デバッグモードで起動するときは `npm run debug`

# データの保存場所
辞書・SE・ブラックリスト・設定は、Discord のサーバごとに分けて `./db/` に保存します。Docker で動かしているときは Docker のボリューム（`db`・`files`・`log`）に保存され、コンテナを作り直しても残ります

| ファイル | 内容 |
|----------|------|
| `db/teach.db` | 単語辞書 |
| `db/soundeffect.db` | SE の一覧 |
| `db/files.db` | SE の音声ファイルの管理 |
| `db/blacklist.db` | ブラックリスト |
| `db/settings.db` | サーバごとの設定（文字数制限・キャラクターなど） |
| `db/recovery.db` | 再起動したときに戻るボイスチャンネル |
| `db/slash-commands.sha256` | 前回登録したスラッシュコマンドの内容（`--if-changed` で使う） |
| `files/` | SE の音声ファイル |
| `log/` | ログ |

# 開発・運用
* コマンドの足し方は [コマンド追加手順書](コマンド追加手順書.md) を参照してください

## 本番と開発を同じマシンで動かす
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

# Thanks
はなこは、次のソフトウェアと声に支えられています

**声と音声サーバ**
* [ebyroid](https://github.com/nanokina/ebyroid)（nanokina）— VOICEROID を音声サーバにする。[Ebycow/ebyroid](https://github.com/Ebycow/ebyroid) はこのフォーク
* [VOICEROID](https://www.ah-soft.com/voiceroid/)（AHS）
* [VOICEVOX](https://voicevox.hiroshiba.jp/)・[AivisSpeech](https://aivis-project.com/)
* [Open JTalk](https://open-jtalk.sourceforge.net/)（名古屋工業大学）と、HTS Voice "Mei"・"Takumi"（[MMDAgent](https://www.mmdagent.jp/)、名古屋工業大学、CC BY 3.0）

**ライブラリ**
* [discord.js](https://discord.js.org/)・[@discordjs/voice](https://github.com/discordjs/discord.js/tree/main/packages/voice)・[opusscript](https://github.com/abalabahaha/opusscript) — Discord との接続と音声の送信
* [FFmpeg](https://ffmpeg.org/)（[ffmpeg-static](https://github.com/eugeneware/ffmpeg-static)）・[prism-media](https://github.com/amishshah/prism-media) — 音声の変換
* [libsamplerate](https://libsndfile.github.io/libsamplerate/)（WebAssembly 版の [@alexanderolsen/libsamplerate-js](https://github.com/aolsenjazz/libsamplerate-js)）— 音声のサンプリングレートの変換。WebAssembly なので OS や CPU を問わず動きます
* [NeDB](https://github.com/seald/nedb)（@seald-io/nedb）— 辞書や設定の保存
* [emojibase-data](https://emojibase.dev/) — 絵文字の読み
* [log4js](https://github.com/log4js-node/log4js-node)・[yaml](https://eemeli.org/yaml/) — ログと設定ファイル

# VS.
喋太郎: https://twitter.com/syabetaro - More cute voice

# トラブル発生?
問題が起きた場合は[Issueに投稿](https://github.com/Ebycow/hanako/issues/new)し、相互に共有してください。他の利用者の助けになります！  
ねこは寂しがり屋でお話が大好きです、開発メンバーのTwitterやDiscordのDMでこっそり質問しないで！😿

# Catgirl
![img20200222233956](https://user-images.githubusercontent.com/18446038/75094313-4a370d80-55cd-11ea-9af1-71cec1bf1d20.png)

彼女は凜々しい白猫でしたが、ある日降り積もるソメイヨシノを枕に眠りについたのち桃色に染まりました

She was a polished white cat, but one day she put on asleep on a pillow with a pile of pink plant petals. Then was painted peach color.

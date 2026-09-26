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
| SE正規化 | SE正規化 se-normalize senorm | /se-normalize | - | @hanako se-normalize 80 |
| ブラックリスト追加 | 沈黙 blacklist-add | /blacklist-add | メンバーをタイムアウト | @hanako blacklist-add @seikin |
| ブラックリスト除外 | 恩赦 blacklist-remove | /blacklist-remove | メンバーをタイムアウト | @hanako blacklist-remove @hikakin |
| ブラックリスト一覧 | 名簿 blacklist-show | /blacklist-show | メンバーをタイムアウト | @hanako blacklist-show |
| ブラックリスト全削除 | 大赦 blacklist-clear | /blacklist-clear | サーバー管理 | @hanako blacklist-clear --force |
| 読み上げキャラ変更 | キャラクター変更 speaker | /speaker | - | @hanako speaker kiritan |
| ヘルプ | 使い方 help | /help | - | @hanako help |
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

## サーバごとの独立管理
辞書・SE・ブラックリスト・設定はすべてDiscordサーバ（ギルド）ごとに独立して管理されます

# Dependencies

## Node.js Runtime
* Node.js 24.21.0
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
* または次のいずれかを提供するHTTP音声サーバ
  * `POST /api/v2/audiostream`（JSON body、chunked raw PCM。推奨）
  * `GET /api/v1/audiostream?text=&name=`（従来互換）

## Special Dependencies
* **node-libsamplerate**: ローカルカスタム依存関係 (`vendor/node-libsamplerate-prebuilt`)
  * libsamplerateのnativeバインディング
  * Windows x64向けprebuiltバイナリを同梱済み

# Install
## 0.前提条件
* **Node.js 24.21.0** — [Volta](https://volta.sh/)を使用している場合、`package.json`の設定により自動的にバージョンが固定されます
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
標準ではEbyroidの `POST /api/v2/audiostream`（JSON body）と、従来の `GET /api/v1/audiostream?text=...&name=...` の両方を利用できます。v2では発言内容をURLに含めず、生成途中のraw PCMを受け取った時点からDiscordへ流します。

Ebyroidは、VoiceroidがインストールされたWindowsマシンを音声サーバとして利用可能にするために最適なアプリケーションです。  
動作には有効なライセンスを持つVoiceroidライブラリを所持している必要があります。アプリケーションのインストールは当該リポジトリから可能です https://github.com/nanokina/ebyroid

hanakoの標準設定では4090番ポートにある音声サーバに接続を行います（これは設定ファイルから変更可能です）  
これは、ebyroidのデフォルト起動時のポート番号設定に従います

```
C:\ebyroid> ebyroid.exe configure
C:\ebyroid> ebyroid.exe start 
```

ストリーミングを有効にするには、`app-config.yml`へ次を設定します。

```yaml
settings:
  ebyroid_stream_api_url: 'http://localhost:4090/api/v2/audiostream'
  ebyroid_stream_api_mode: 'auto'
```

`auto`はURLが `/api/v2/audiostream`ならPOSTストリーミング、それ以外なら従来GETを選びます。明示的に固定する場合は `streaming-post` または `legacy-get` を指定できます。環境変数 `EBYROID_STREAM_API_URL` と `EBYROID_STREAM_API_MODE` でも上書きできます。

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

# Architecture
## 技術スタック
| カテゴリ | 技術 |
|----------|------|
| Runtime | Node.js 24.21.0 |
| Discord | discord.js 14, @discordjs/voice, opusscript |
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

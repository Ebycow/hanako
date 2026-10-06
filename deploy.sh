#!/usr/bin/env bash
# 本番の hanako（Docker Compose）を更新する
#
# 使い方（本番のチェックアウトで実行する）:
#   ./deploy.sh                  origin/master の内容を出す
#   ./deploy.sh origin/porting   指定した ref（リモートのブランチ、開発用 worktree のブランチ、コミット ID など）の内容を出す
#
# 本番のチェックアウトはブランチに固定せず、出したコミットを detached HEAD で指す。作業ツリーに変更があれば止める
# 手順: チェックアウト → イメージのビルド（コミット ID のタグ）→ スラッシュコマンドの登録
#       → hanako:latest を付け替えて起動 → healthy になるのを待つ
# 失敗したら、前のコミットと前のイメージに戻して起動し直す
#
# 環境変数:
#   SKIP_COMMANDS=1    スラッシュコマンドの登録を省く
#   HEALTH_TIMEOUT     healthy になるまで待つ秒数（既定 180）
#   KEEP_IMAGES        残しておく過去のイメージの数（既定 3）
set -Eeuo pipefail

DEFAULT_REF=origin/master
HEALTH_TIMEOUT=${HEALTH_TIMEOUT:-180}
KEEP_IMAGES=${KEEP_IMAGES:-3}
SERVICE=hanako
IMAGE=hanako

log() { echo "[deploy] $*"; }
die() { echo "[deploy] $*" >&2; exit 1; }

# チェックアウトでこのファイル自体が書き換わっても動きが変わらないよう、全体を関数にして読み込んでから実行する
main() {
    cd "$(dirname "$0")"

    # ---- 前提の確認 ----

    [ -z "$(git status --porcelain --untracked-files=no)" ] || die "作業ツリーに未コミットの変更があるため中止"
    # 開発と同じ dev タグで本番を起動しないよう、.env で latest を指定させる
    grep -qE '^HANAKO_TAG=latest$' .env 2>/dev/null || die ".env に HANAKO_TAG=latest がないため中止"

    git fetch --prune origin
    local ref=${1:-$DEFAULT_REF}
    local target
    target=$(git rev-parse --verify --quiet "$ref^{commit}") || die "$ref が見つからないため中止"
    # Docker 化より前のコミットは、このスクリプトでは出せない
    for f in compose.yaml Dockerfile deploy.sh; do
        git cat-file -e "$target:$f" 2>/dev/null || die "$ref に $f がないため中止（Docker 化より前のコミット）"
    done

    prev_commit=$(git rev-parse HEAD)
    prev_image=$(docker image inspect -f '{{.Id}}' "$IMAGE:latest" 2>/dev/null || true)

    git checkout --quiet --detach "$target"
    local commit
    commit=$(git rev-parse --short HEAD)
    log "コミット: $(git rev-parse --short "$prev_commit") → $commit ($ref)"

    trap rollback ERR

    # ---- 更新 ----

    log "イメージをビルド ($IMAGE:$commit)"
    HANAKO_TAG=$commit docker compose build "$SERVICE"

    if [ "${SKIP_COMMANDS:-}" != 1 ]; then
        log "スラッシュコマンドを登録"
        HANAKO_TAG=$commit docker compose run --rm --no-deps "$SERVICE" node deploy-commands.js
    fi

    docker tag "$IMAGE:$commit" "$IMAGE:latest"
    log "起動"
    HANAKO_TAG=latest docker compose up -d "$SERVICE"

    log "healthy になるまで待つ（最大 ${HEALTH_TIMEOUT} 秒）"
    local container health deadline
    container=$(HANAKO_TAG=latest docker compose ps -q "$SERVICE")
    deadline=$((SECONDS + HEALTH_TIMEOUT))
    while :; do
        health=$(docker inspect -f '{{if .State.Health}}{{.State.Health.Status}}{{else}}{{.State.Status}}{{end}}' "$container")
        case "$health" in
            healthy) break ;;
            unhealthy | exited | dead) log "コンテナが $health になった"; false ;;
        esac
        [ "$SECONDS" -lt "$deadline" ] || { log "時間内に healthy にならなかった ($health)"; false; }
        sleep 3
    done
    trap - ERR
    log "完了: $commit ($ref)"

    # ---- 古いイメージの整理（コミット ID のタグを新しいほうから KEEP_IMAGES 個残す）----
    # 消せなくても（停止中のコンテナが使っているなど）出すこと自体は済んでいるので、失敗扱いにしない

    docker image ls "$IMAGE" --format '{{.CreatedAt}}\t{{.Tag}}' \
        | sort -r | cut -f2 | grep -vE '^(latest|dev|<none>)$' \
        | tail -n +"$((KEEP_IMAGES + 1))" \
        | while read -r tag; do
            if docker image rm "$IMAGE:$tag" >/dev/null; then
                log "古いイメージを削除: $IMAGE:$tag"
            else
                log "古いイメージを削除できなかった: $IMAGE:$tag"
            fi
        done
}

# ---- 失敗したら戻す ----

rollback() {
    local status=$?
    trap - ERR
    log "失敗したため $(git rev-parse --short "$prev_commit") に戻す"
    git checkout --quiet --force --detach "$prev_commit"
    if [ -n "$prev_image" ]; then
        docker tag "$prev_image" "$IMAGE:latest"
        HANAKO_TAG=latest docker compose up -d "$SERVICE" || log "前のイメージでの起動にも失敗。手動で確認してください"
    fi
    log "スラッシュコマンドは登録し直していない（必要なら前のコミットで deploy-commands.js を実行する）"
    exit "$status"
}

main "$@"
exit

#!/usr/bin/env bash
# 本番の hanako（Docker Compose）を更新する
#
# 使い方（本番のチェックアウトで実行する）:
#   ./deploy.sh            origin/<本番のブランチ> の内容を出す
#   ./deploy.sh ttshub     同じリポジトリの別のブランチ（開発用 worktree など）の内容を出す
#
# 取り込みは fast-forward だけ。作業ツリーに変更があれば止める
# 手順: 取り込み → イメージのビルド（コミット ID のタグ）→ スラッシュコマンドの登録
#       → hanako:latest を付け替えて起動 → healthy になるのを待つ
# 失敗したら、前のコミットと前のイメージに戻して起動し直す
#
# 環境変数:
#   DEPLOY_BRANCH      本番のブランチ（既定 porting）。ほかのブランチのチェックアウトでは実行しない
#   SKIP_COMMANDS=1    スラッシュコマンドの登録を省く
#   HEALTH_TIMEOUT     healthy になるまで待つ秒数（既定 180）
#   KEEP_IMAGES        残しておく過去のイメージの数（既定 3）
set -euo pipefail
cd "$(dirname "$0")"

DEPLOY_BRANCH=${DEPLOY_BRANCH:-porting}
HEALTH_TIMEOUT=${HEALTH_TIMEOUT:-180}
KEEP_IMAGES=${KEEP_IMAGES:-3}
SERVICE=hanako
IMAGE=hanako

log() { echo "[deploy] $*"; }
die() { echo "[deploy] $*" >&2; exit 1; }

# ---- 前提の確認 ----

branch=$(git symbolic-ref --short HEAD)
[ "$branch" = "$DEPLOY_BRANCH" ] || die "本番のブランチ ($DEPLOY_BRANCH) ではない ($branch) ため中止"
[ -z "$(git status --porcelain --untracked-files=no)" ] || die "作業ツリーに未コミットの変更があるため中止"
# 開発と同じ dev タグで本番を起動しないよう、.env で latest を指定させる
grep -qE '^HANAKO_TAG=latest$' .env 2>/dev/null || die ".env に HANAKO_TAG=latest がないため中止"

git fetch --prune origin
ref=${1:-origin/$DEPLOY_BRANCH}
prev_commit=$(git rev-parse HEAD)
prev_image=$(docker image inspect -f '{{.Id}}' "$IMAGE:latest" 2>/dev/null || true)

git merge --ff-only "$ref"
commit=$(git rev-parse --short HEAD)
log "コミット: $(git rev-parse --short "$prev_commit") → $commit"

# ---- 失敗したら戻す ----

rollback() {
    local status=$?
    trap - ERR
    log "失敗したため $(git rev-parse --short "$prev_commit") に戻す"
    git reset --hard "$prev_commit"
    if [ -n "$prev_image" ]; then
        docker tag "$prev_image" "$IMAGE:latest"
        HANAKO_TAG=latest docker compose up -d "$SERVICE" || log "前のイメージでの起動にも失敗。手動で確認してください"
    fi
    log "スラッシュコマンドは登録し直していない（必要なら前のコミットで deploy-commands.js を実行する）"
    exit "$status"
}
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
log "完了: $commit"

# ---- 古いイメージの整理（コミット ID のタグを新しいほうから KEEP_IMAGES 個残す）----

docker image ls "$IMAGE" --format '{{.CreatedAt}}\t{{.Tag}}' \
    | sort -r | cut -f2 | grep -vE '^(latest|dev|<none>)$' \
    | tail -n +"$((KEEP_IMAGES + 1))" \
    | while read -r tag; do docker image rm "$IMAGE:$tag" >/dev/null && log "古いイメージを削除: $IMAGE:$tag"; done

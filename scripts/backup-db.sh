#!/usr/bin/env bash
#
# Automated PostgreSQL backup.
#
# Creates a compressed pg_dump in ./backups/, then prunes anything older
# than BACKUP_RETENTION_DAYS. Safe to run from cron:
#
#   # every day at 03:15
#   15 3 * * * cd /path/to/project && bash scripts/backup-db.sh >> backups/backup.log 2>&1
#
# Env (all optional — sensible defaults):
#   DATABASE_URL            connection string (required)
#   BACKUP_DIR              default ./backups
#   BACKUP_RETENTION_DAYS   default 7
#   PG_BIN                  default: auto-detect (pg_dump on PATH, then the
#                           local Windows install)
#
# Exit codes: 0 ok · 1 config error · 2 dump failed · 3 verification failed

set -euo pipefail

BACKUP_DIR="${BACKUP_DIR:-./backups}"
RETENTION_DAYS="${BACKUP_RETENTION_DAYS:-7}"

# --- locate pg_dump -------------------------------------------------------
if [ -z "${PG_BIN:-}" ]; then
  if command -v pg_dump >/dev/null 2>&1; then
    PG_BIN="$(dirname "$(command -v pg_dump)")"
  elif [ -x "/d/POSTGRE SQL/bin/pg_dump" ]; then
    PG_BIN="/d/POSTGRE SQL/bin"
  else
    echo "✗ pg_dump not found — set PG_BIN to your PostgreSQL bin directory" >&2
    exit 1
  fi
fi

if [ -z "${DATABASE_URL:-}" ]; then
  if [ -f .env ]; then
    DATABASE_URL="$(grep -E '^DATABASE_URL=' .env | head -1 | cut -d= -f2- | tr -d '"')"
  fi
fi

if [ -z "${DATABASE_URL:-}" ]; then
  echo "✗ DATABASE_URL is not set" >&2
  exit 1
fi

mkdir -p "$BACKUP_DIR"

# pg_dump rejects Prisma-only query params (schema, connection_limit, …)
DUMP_URL="${DATABASE_URL%%\?*}"

STAMP="$(date +%Y%m%d-%H%M%S)"
FILE="$BACKUP_DIR/nexora-$STAMP.sql.gz"
TMP="$BACKUP_DIR/.nexora-$STAMP.sql"

echo "→ dumping database to $FILE"

# --no-owner / --no-privileges keep the dump restorable into a different
# role than the one that produced it (staging, a fresh prod instance, …)
if ! "$PG_BIN/pg_dump" \
      --dbname="$DUMP_URL" \
      --no-owner \
      --no-privileges \
      --clean \
      --if-exists \
      --format=plain \
      > "$TMP" 2>"$BACKUP_DIR/.last-error"; then
  echo "✗ pg_dump failed:" >&2
  cat "$BACKUP_DIR/.last-error" >&2
  rm -f "$TMP" "$BACKUP_DIR/.last-error"
  exit 2
fi

rm -f "$BACKUP_DIR/.last-error"

# --- compress -------------------------------------------------------------
gzip -9 -c "$TMP" > "$FILE"
rm -f "$TMP"

# --- verify the archive is readable and non-trivial -----------------------
if ! gzip -t "$FILE" 2>/dev/null; then
  echo "✗ archive failed integrity check: $FILE" >&2
  exit 3
fi

SIZE_BYTES="$(wc -c < "$FILE" | tr -d ' ')"
SIZE_HUMAN="$(du -h "$FILE" | cut -f1)"

if [ "$SIZE_BYTES" -lt 1000 ]; then
  echo "✗ archive suspiciously small ($SIZE_BYTES bytes) — keeping it for inspection" >&2
  exit 3
fi

echo "✓ backup created: $FILE ($SIZE_HUMAN)"

# --- retention ------------------------------------------------------------
PRUNED=0
while IFS= read -r old; do
  rm -f "$old"
  PRUNED=$((PRUNED + 1))
done < <(find "$BACKUP_DIR" -maxdepth 1 -name 'nexora-*.sql.gz' -type f -mtime "+$RETENTION_DAYS" 2>/dev/null || true)

if [ "$PRUNED" -gt 0 ]; then
  echo "✓ pruned $PRUNED backup(s) older than $RETENTION_DAYS day(s)"
fi

# --- summary --------------------------------------------------------------
COUNT="$(find "$BACKUP_DIR" -maxdepth 1 -name 'nexora-*.sql.gz' -type f | wc -l | tr -d ' ')"
TOTAL="$(du -sh "$BACKUP_DIR" 2>/dev/null | cut -f1)"
echo "✓ $COUNT backup(s) on disk, $TOTAL total"

#!/usr/bin/env bash
#
# Restore a Nexora PostgreSQL backup.
#
#   bash scripts/restore-db.sh backups/nexora-20261024-031500.sql.gz
#   bash scripts/restore-db.sh backups/... --yes     # skip confirmation
#
# DANGER: this drops and recreates every table in the target database.
# It always asks for confirmation unless --yes is passed.
#
# Env:
#   DATABASE_URL  connection string (required)
#   PG_BIN        PostgreSQL bin directory (auto-detected)

set -euo pipefail

FILE="${1:-}"
CONFIRM="${2:-}"

if [ -z "$FILE" ]; then
  echo "usage: bash scripts/restore-db.sh <backup.sql.gz> [--yes]" >&2
  exit 1
fi

if [ ! -f "$FILE" ]; then
  echo "✗ file not found: $FILE" >&2
  exit 1
fi

if [ -z "${PG_BIN:-}" ]; then
  if command -v psql >/dev/null 2>&1; then
    PG_BIN="$(dirname "$(command -v psql)")"
  elif [ -x "/d/POSTGRE SQL/bin/psql" ]; then
    PG_BIN="/d/POSTGRE SQL/bin"
  else
    echo "✗ psql not found — set PG_BIN" >&2
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

# strip Prisma-only query params that psql rejects
PSQL_URL="${DATABASE_URL%%\?*}"

if ! gzip -t "$FILE" 2>/dev/null; then
  echo "✗ archive is corrupt: $FILE" >&2
  exit 1
fi

SIZE="$(du -h "$FILE" | cut -f1)"
echo "backup: $FILE ($SIZE)"
echo "target: ${PSQL_URL%%@*}@…"
echo
echo "⚠️  This will DROP every table in the target database and restore the dump."
echo

if [ "$CONFIRM" != "--yes" ]; then
  read -r -p "type 'restore' to continue: " ANSWER
  if [ "$ANSWER" != "restore" ]; then
    echo "aborted"
    exit 1
  fi
fi

echo "→ restoring…"
gzip -dc "$FILE" | "$PG_BIN/psql" --dbname="$PSQL_URL" --quiet --set ON_ERROR_STOP=0

echo "✓ restore finished"
echo
echo "next steps:"
echo "  npx prisma generate"
echo "  curl -f http://localhost:3100/api/health"

#!/usr/bin/env bash
# Start the project's dedicated PostgreSQL cluster (port 5433).
#
# The cluster lives in .pgdata/ and is independent of any system-wide
# PostgreSQL install — no password guessing, no shared state.
#
# Usage:  bash scripts/start-db.sh
# Stop:   bash scripts/stop-db.sh

set -e

PGBIN="/d/POSTGRE SQL/bin"
[ -d "$PGBIN" ] || PGBIN="$(dirname "$(command -v postgres)")"

if [ ! -d .pgdata ]; then
  echo "→ initialising cluster in .pgdata"
  "$PGBIN/initdb" -D .pgdata -U nexora --auth=trust --encoding=UTF8 --locale=C >/dev/null
fi

if "$PGBIN/pg_ctl" -D .pgdata status >/dev/null 2>&1; then
  echo "✓ PostgreSQL already running on port 5433"
  exit 0
fi

echo "→ starting PostgreSQL on port 5433"
"$PGBIN/pg_ctl" -D .pgdata -o "-p 5433" -l .pgdata/server.log start
sleep 2

if "$PGBIN/psql" -h 127.0.0.1 -p 5433 -U nexora -d postgres -tAc "SELECT 1" >/dev/null 2>&1; then
  echo "✓ PostgreSQL ready — postgresql://nexora@127.0.0.1:5433/nexora"
else
  echo "✗ failed to start — see .pgdata/server.log"
  exit 1
fi

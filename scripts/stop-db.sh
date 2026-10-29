#!/usr/bin/env bash
# Stop the project's dedicated PostgreSQL cluster.
set -e

PGBIN="/d/POSTGRE SQL/bin"
[ -d "$PGBIN" ] || PGBIN="$(dirname "$(command -v postgres)")"

"$PGBIN/pg_ctl" -D .pgdata stop -m fast && echo "✓ PostgreSQL stopped"

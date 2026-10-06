#!/usr/bin/env bash
# Dumps the database to a timestamped SQL file and refreshes db/backups/latest.sql
# (the committed snapshot). Keeps a restorable SQL copy in the repo so you can
# move to any other Postgres at any time.
#
# Dumps over DIRECT_URL, not DATABASE_URL: pg_dump needs a real session, and a
# transaction-mode pooler (pgbouncer) will reject it. Falls back to DATABASE_URL
# for setups that have no separate direct connection.
#
# Usage:  npm run db:backup
# Requires: pg_dump on PATH, DIRECT_URL (or DATABASE_URL) set (reads api/.env).
set -euo pipefail

cd "$(dirname "$0")/.."

# Load connection strings from .env if not already exported.
if [ -f .env ]; then
  [ -z "${DIRECT_URL:-}" ] && eval "export $(grep -E '^DIRECT_URL=' .env | tail -n1)" || true
  [ -z "${DATABASE_URL:-}" ] && eval "export $(grep -E '^DATABASE_URL=' .env | tail -n1)" || true
fi

DUMP_URL="${DIRECT_URL:-${DATABASE_URL:-}}"

if [ -z "${DUMP_URL}" ]; then
  echo "Neither DIRECT_URL nor DATABASE_URL is set (checked env and .env)." >&2
  exit 1
fi

mkdir -p db/backups
STAMP="$(date +%Y%m%d-%H%M%S)"
OUT="db/backups/dump-${STAMP}.sql"

echo "Dumping database -> ${OUT}"
pg_dump --no-owner --no-privileges "${DUMP_URL}" > "${OUT}"

cp "${OUT}" db/backups/latest.sql
echo "Updated db/backups/latest.sql"
echo "Done."

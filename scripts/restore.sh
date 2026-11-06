#!/bin/sh
set -e

# Add common PostgreSQL binary locations to PATH for cross-platform support
export PATH="$PATH:/c/Program Files/PostgreSQL/18/bin:/c/Program Files/PostgreSQL/17/bin:/c/Program Files/PostgreSQL/16/bin:/usr/local/bin:/usr/bin"

BACKUP_FILE="$1"

if [ -z "$BACKUP_FILE" ]; then
  # Default to most recent backup file in backups/
  BACKUP_FILE=$(ls -t backups/*.sql 2>/dev/null | head -n 1)
  if [ -z "$BACKUP_FILE" ]; then
    echo "Usage: $0 <path-to-backup.sql>" >&2
    echo "Error: No backup file specified and none found in backups/." >&2
    exit 1
  fi
  echo "No backup file specified. Using most recent: ${BACKUP_FILE}"
fi

if [ ! -f "$BACKUP_FILE" ]; then
  echo "Error: Backup file '${BACKUP_FILE}' not found." >&2
  exit 1
fi

if [ -f .env ]; then
  eval $(grep -v '^#' .env | sed 's/\r$//' | sed 's/^[[:space:]]*//' | grep -v '^$' | sed 's/\([^=]*\)=\(.*\)/\1="\2"/')
fi

TARGET_DB="${RESTORE_DB:-${POSTGRES_DB:-bhc}}"
POSTGRES_USER="${POSTGRES_USER:-postgres}"
POSTGRES_HOST="${POSTGRES_HOST:-localhost}"
POSTGRES_PORT="${POSTGRES_PORT:-5432}"

echo "Restoring ${BACKUP_FILE} into database '${TARGET_DB}'..."

if command -v docker >/dev/null 2>&1 && docker compose ps --status running db 2>/dev/null | grep -q db; then
  echo "Restoring via docker compose 'db' container..."
  docker compose exec -T db psql -U "$POSTGRES_USER" -d "$TARGET_DB" < "$BACKUP_FILE"
elif command -v psql >/dev/null 2>&1; then
  echo "Restoring via PostgreSQL psql (${POSTGRES_HOST}:${POSTGRES_PORT})..."
  PGPASSWORD="${POSTGRES_PASSWORD}" psql -h "$POSTGRES_HOST" -p "$POSTGRES_PORT" -U "$POSTGRES_USER" -d "$TARGET_DB" < "$BACKUP_FILE"
else
  echo "Error: Neither docker nor psql was found in PATH." >&2
  exit 1
fi

echo "Restore completed successfully into '${TARGET_DB}'."

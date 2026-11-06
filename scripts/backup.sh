#!/bin/sh
set -e

# Add common PostgreSQL binary locations to PATH for cross-platform support
export PATH="$PATH:/c/Program Files/PostgreSQL/18/bin:/c/Program Files/PostgreSQL/17/bin:/c/Program Files/PostgreSQL/16/bin:/usr/local/bin:/usr/bin"

# Read environment variables from .env if present (without echoing secrets)
if [ -f .env ]; then
  # Load non-comment lines
  eval $(grep -v '^#' .env | sed 's/\r$//' | sed 's/^[[:space:]]*//' | grep -v '^$' | sed 's/\([^=]*\)=\(.*\)/\1="\2"/')
fi

POSTGRES_DB="${POSTGRES_DB:-bhc}"
POSTGRES_USER="${POSTGRES_USER:-postgres}"
POSTGRES_HOST="${POSTGRES_HOST:-localhost}"
POSTGRES_PORT="${POSTGRES_PORT:-5432}"

TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_DIR="backups"
BACKUP_FILE="${BACKUP_DIR}/bhc_backup_${TIMESTAMP}.sql"

mkdir -p "$BACKUP_DIR"

echo "Creating database backup at ${BACKUP_FILE}..."

# Check if docker compose db service is running
if command -v docker >/dev/null 2>&1 && docker compose ps --status running db 2>/dev/null | grep -q db; then
  echo "Backing up from docker compose 'db' container..."
  docker compose exec -T db pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" --clean --if-exists --no-owner --no-privileges > "$BACKUP_FILE"
elif command -v pg_dump >/dev/null 2>&1; then
  echo "Backing up from PostgreSQL instance (${POSTGRES_HOST}:${POSTGRES_PORT})..."
  PGPASSWORD="${POSTGRES_PASSWORD}" pg_dump -h "$POSTGRES_HOST" -p "$POSTGRES_PORT" -U "$POSTGRES_USER" -d "$POSTGRES_DB" --clean --if-exists --no-owner --no-privileges > "$BACKUP_FILE"
else
  echo "Error: Neither docker nor pg_dump was found in PATH." >&2
  exit 1
fi

if [ -s "$BACKUP_FILE" ]; then
  SIZE=$(wc -c < "$BACKUP_FILE" | tr -d ' ')
  echo "Backup completed successfully: ${BACKUP_FILE} (${SIZE} bytes)"
else
  echo "Error: Backup file is empty." >&2
  exit 1
fi

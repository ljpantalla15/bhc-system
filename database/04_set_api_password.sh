#!/bin/sh
# Runs on first database start (after the .sql files). Sets the bhc_api password from the environment.
set -e
psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<EOSQL
ALTER ROLE bhc_api PASSWORD '${BHC_API_PASSWORD}';
EOSQL

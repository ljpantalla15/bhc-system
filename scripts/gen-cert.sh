#!/bin/sh
# Creates a self-signed HTTPS certificate for local development (valid 1 year).
set -e
mkdir -p certs
openssl req -x509 -nodes -newkey rsa:2048 -days 365 \
  -keyout certs/server.key -out certs/server.crt \
  -subj "/CN=localhost" -addext "subjectAltName=DNS:localhost,IP:127.0.0.1"
echo "Created certs/server.crt and certs/server.key (your browser will warn: self-signed)."

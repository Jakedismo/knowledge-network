#!/usr/bin/env bash
set -euo pipefail

# Generate a Prisma client for SQLite into generated/prisma-sqlite-client
# without modifying the main Postgres schema.

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
PRISMA_DIR="$ROOT_DIR/prisma"
TMP_DIR="$PRISMA_DIR/.sqlite-tmp"
OUT_DIR="$ROOT_DIR/generated/prisma-sqlite-client"

mkdir -p "$TMP_DIR"
rm -rf "$OUT_DIR"

# Create a SQLite variant of schema.prisma by replacing datasource provider and URL
awk '
  /datasource db {/ { print; in_ds=1; next }
  in_ds==1 && /provider/ { print "  provider = \"sqlite\""; next }
  in_ds==1 && /url/ { print "  url      = \"file:./dev.db\""; next }
  { print }
  /}/ { if (in_ds==1) in_ds=0 }
' "$PRISMA_DIR/schema.prisma" > "$TMP_DIR/schema.sqlite.prisma"

# Append generator output override
cat >> "$TMP_DIR/schema.sqlite.prisma" <<EOF

generator client {
  provider = "prisma-client-js"
  output   = "$OUT_DIR"
}
EOF

echo "Generating Prisma SQLite client into $OUT_DIR"
DATABASE_URL="file:$TMP_DIR/dev.db" npx prisma generate --schema "$TMP_DIR/schema.sqlite.prisma"

echo "SQLite client generated. To run tests with it, set E2E_PRISMA_SQLITE=1."


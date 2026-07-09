#!/usr/bin/env bash
#
# setup-library.sh — one command to stand up Caplet's RAG "library".
#
# Runs, in order:  npm install  →  DB migration  →  ingest resources  →  test search
#
# DEFAULT (no flags): ingests the LOCAL sample file in content/curriculum/ — works
# with zero Google Cloud setup, only your OPENAI_API_KEY. Great for a first run.
#
#   bash setup-library.sh                      # local sample -> curriculum
#   bash setup-library.sh --source=gdrive      # pull from your Google Drive folder
#   bash setup-library.sh --kind=marking       # set up the marking library instead
#   bash setup-library.sh --query="parabola"   # change the test search query
#
# Prereqs you must have done first:
#   1) backend/.env exists with OPENAI_API_KEY set
#      (this script will create .env from .env.example if missing, then stop so
#       you can paste your key in)
#   2) for --source=gdrive: GOOGLE_DRIVE_FOLDER_ID + GOOGLE_SERVICE_ACCOUNT_JSON
#      set in backend/.env, and the Drive folder shared with the service account.

set -euo pipefail

# ── Pretty output ──────────────────────────────────────────────────────────
bold() { printf "\033[1m%s\033[0m\n" "$1"; }
ok()   { printf "\033[32m✅ %s\033[0m\n" "$1"; }
warn() { printf "\033[33m⚠️  %s\033[0m\n" "$1"; }
err()  { printf "\033[31m❌ %s\033[0m\n" "$1"; }
step() { printf "\n\033[1;36m▶ %s\033[0m\n" "$1"; }

# ── Args ───────────────────────────────────────────────────────────────────
SOURCE="local"
KIND="curriculum"
QUERY="quadratic equations"
STAGE="Stage 5"
AREA="Mathematics"
PARSER="generic"
for arg in "$@"; do
  case "$arg" in
    --source=*) SOURCE="${arg#*=}" ;;
    --kind=*)   KIND="${arg#*=}" ;;
    --query=*)  QUERY="${arg#*=}" ;;
    --stage=*)  STAGE="${arg#*=}" ;;
    --area=*)   AREA="${arg#*=}" ;;
    --parser=*) PARSER="${arg#*=}" ;;
    -h|--help)
      grep '^#' "$0" | sed 's/^# \{0,1\}//'; exit 0 ;;
    *) err "Unknown flag: $arg"; exit 1 ;;
  esac
done

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

bold "Caplet Library setup  (source=$SOURCE, kind=$KIND)"

# ── 0. Prerequisites ───────────────────────────────────────────────────────
step "Checking prerequisites"
command -v node >/dev/null 2>&1 || { err "Node.js is not installed. Install Node 18+ first."; exit 1; }
command -v npm  >/dev/null 2>&1 || { err "npm is not installed."; exit 1; }
ok "node $(node -v), npm $(npm -v)"

# ── 1. backend/.env + OPENAI_API_KEY ───────────────────────────────────────
step "Checking backend/.env"
if [ ! -f backend/.env ]; then
  if [ -f backend/.env.example ]; then
    cp backend/.env.example backend/.env
    warn "Created backend/.env from .env.example."
    warn "Open backend/.env, set OPENAI_API_KEY=sk-..., then re-run this script."
    exit 1
  else
    err "backend/.env and backend/.env.example are both missing."; exit 1
  fi
fi
if ! grep -Eq '^OPENAI_API_KEY=.+' backend/.env; then
  err "OPENAI_API_KEY is empty in backend/.env. Set it (sk-...) and re-run."
  exit 1
fi
ok "backend/.env present and OPENAI_API_KEY is set"

if [ "$SOURCE" = "gdrive" ]; then
  if ! grep -Eq '^GOOGLE_SERVICE_ACCOUNT_JSON=.+' backend/.env || ! grep -Eq '^GOOGLE_DRIVE_FOLDER_ID=.+' backend/.env; then
    err "Google Drive selected but GOOGLE_DRIVE_FOLDER_ID / GOOGLE_SERVICE_ACCOUNT_JSON not set in backend/.env."
    err "See docs/library-setup.md step 4, or run without --source=gdrive to use the local sample."
    exit 1
  fi
  ok "Google Drive credentials present"
fi

# ── 2. Install backend dependencies ────────────────────────────────────────
step "Installing backend dependencies (npm install)"
( cd backend && npm install )
ok "Dependencies installed"

# ── 3. Run database migration ──────────────────────────────────────────────
step "Running database migration (creates the library tables)"
( cd backend && node scripts/migrate.js )
ok "Database is ready"

# ── 4. Ingest resources ────────────────────────────────────────────────────
step "Ingesting resources into the [$KIND] library from '$SOURCE'"
if [ "$SOURCE" = "local" ]; then
  ( cd backend && node scripts/ingest-library.js \
      --connector=local --kind="$KIND" --folder="../content/$KIND" --parser="$PARSER" \
      --learningArea="$AREA" --stage="$STAGE" --sourceVersion="sample" )
else
  ( cd backend && node scripts/ingest-library.js \
      --connector=gdrive --kind="$KIND" --parser="$PARSER" \
      --learningArea="$AREA" --stage="$STAGE" --sourceVersion="sample" )
fi
ok "Ingestion finished"

# ── 5. Test retrieval ──────────────────────────────────────────────────────
step "Testing retrieval — searching for: \"$QUERY\""
( cd backend && node scripts/library-search.js "$KIND" "$QUERY" --stage="$STAGE" )

echo
ok "Library is set up and working."
bold "Next: replace the sample file with real content, then re-run this script."

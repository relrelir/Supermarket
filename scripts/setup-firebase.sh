#!/usr/bin/env bash
# Sets up a Firebase project for the app and writes its web config to src/firebase-config.json.
# Usage: npm run firebase:setup -- <project-id> [--create]
#   --create  creates a new Google Cloud project first (otherwise an existing one is used).
# Requires being logged in: `firebase login`, or `gcloud auth application-default login`.
set -euo pipefail

PROJECT="${1:?usage: setup-firebase.sh <project-id> [--create]}"
LOCATION="${FIRESTORE_LOCATION:-eur3}"
cd "$(dirname "$0")/.."
fb() { npx -y firebase-tools@15 "$@" --project "$PROJECT" --non-interactive; }

if [[ "${2:-}" == "--create" ]]; then
  npx -y firebase-tools@15 projects:create "$PROJECT" --display-name "Family Shopping List" --non-interactive
else
  npx -y firebase-tools@15 projects:addfirebase "$PROJECT" --non-interactive || true # no-op if already added
fi

fb firestore:databases:create "(default)" --location="$LOCATION" || echo "Firestore database already exists"

printf '{\n  "projects": {\n    "default": "%s"\n  }\n}\n' "$PROJECT" > .firebaserc
# Enables anonymous sign-in (see "auth" in firebase.json) and uploads firestore.rules.
fb deploy --only auth,firestore:rules

APP_ID=$(fb apps:list web --json | node -e 'const r=JSON.parse(require("fs").readFileSync(0)).result; console.log(r[0]?.appId ?? "")')
if [[ -z "$APP_ID" ]]; then
  APP_ID=$(fb apps:create web "Shopping List" --json | node -e 'console.log(JSON.parse(require("fs").readFileSync(0)).result.appId)')
fi
fb apps:sdkconfig web "$APP_ID" --json | node -e '
  const c = JSON.parse(require("fs").readFileSync(0)).result.sdkConfig;
  const keys = ["apiKey", "authDomain", "projectId", "storageBucket", "messagingSenderId", "appId"];
  require("fs").writeFileSync("src/firebase-config.json", JSON.stringify(Object.fromEntries(keys.map((k) => [k, c[k]])), null, 2) + "\n");'

echo "Done. src/firebase-config.json now points at $PROJECT — commit it and push to rebuild the app."

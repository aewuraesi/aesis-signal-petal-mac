#!/bin/zsh

cd "$(dirname "$0")"

if ! command -v node >/dev/null 2>&1; then
  echo "Node.js 22 or newer is needed to run Aesi's Signal Petal."
  echo "Install it from https://nodejs.org, then open this file again."
  read "?Press Return to close..."
  exit 1
fi

if [ ! -d node_modules ]; then
  echo "Setting up Aesi's Signal Petal for the first time..."
  corepack pnpm install || exit 1
fi

echo "Starting Aesi's Signal Petal at http://localhost:3000"
corepack pnpm dev

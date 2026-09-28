#!/usr/bin/env bash
# Publishes OpenGreenBook to gintong.dev/opengreenbook.
# gintong.dev is the portfolio repo's GitHub Pages site, so this copies the build into
# portfolio/public/opengreenbook and pushes; the portfolio's Pages workflow does the rest.
set -euo pipefail
cd "$(dirname "$0")/.."
PORTFOLIO_DIR="${PORTFOLIO_DIR:-../portfolio}"
SHA="$(git rev-parse --short HEAD)"

npm run validate
npm run build

rm -rf "$PORTFOLIO_DIR/public/opengreenbook"
cp -R dist "$PORTFOLIO_DIR/public/opengreenbook"

cd "$PORTFOLIO_DIR"
git add public/opengreenbook
if git diff --cached --quiet -- public/opengreenbook; then
  echo "OpenGreenBook build unchanged; nothing to deploy."
  exit 0
fi
git commit -m "Update OpenGreenBook build (opengreenbook@$SHA)" -- public/opengreenbook
git push
echo "Pushed. gintong.dev/opengreenbook updates when the portfolio Pages workflow finishes."

#!/bin/bash
# Generate PWA PNG icons from icon-source.svg using Docker + sharp.
# Runs on Linux/Mac/Windows where Docker is available.
# Output: frontend/public/icons/{icon-192x192.png,icon-512x512.png,apple-touch-icon.png,icon-maskable-512.png}
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PUBLIC_DIR="$SCRIPT_DIR/../frontend/public"

if [[ ! -f "$PUBLIC_DIR/icon-source.svg" ]]; then
  echo "Error: $PUBLIC_DIR/icon-source.svg not found"
  exit 1
fi

mkdir -p "$PUBLIC_DIR/icons"

docker run --rm \
  -v "$PUBLIC_DIR:/work" \
  -w /work \
  node:20-alpine sh -c '
    npm i --silent sharp@0.34 &&
    node -e "
      const sharp = require(\"sharp\");
      const fs = require(\"fs\");
      const svg = fs.readFileSync(\"icon-source.svg\");
      const targets = [
        [192, \"icons/icon-192x192.png\"],
        [512, \"icons/icon-512x512.png\"],
        [180, \"icons/apple-touch-icon.png\"],
        [512, \"icons/icon-maskable-512.png\"]
      ];
      Promise.all(targets.map(([s, p]) =>
        sharp(svg).resize(s, s).png().toFile(p).then(() => console.log(\"  ✓ \" + p))
      )).then(() => console.log(\"Done.\")).catch(e => { console.error(e); process.exit(1); });
    "
  '

echo ""
echo "Icons generated in $PUBLIC_DIR/icons/"
ls -la "$PUBLIC_DIR/icons/"*.png

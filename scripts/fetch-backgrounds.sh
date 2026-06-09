#!/usr/bin/env bash
#
# fetch-backgrounds.sh — download the looping video backgrounds into public/.
#
# These clips are free-license stock from Mixkit (https://mixkit.co). The Mixkit
# Free License lets you use them in a project but NOT redistribute the raw files,
# so they are gitignored and fetched on demand instead of being committed.
#
# Usage:  ./scripts/fetch-backgrounds.sh
#
# Deps: bash, curl. Safe to re-run (skips files already present).

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DEST="$ROOT/public"
UA="Mozilla/5.0 (compatible; lofi-radio-setup)"

# Mixkit video id | output filename  (must match public/backgroundImages.json)
CLIPS=(
  "5399|synthwave-drive.mp4"
  "19213|neon-city.mp4"
  "31534|neon-highway.mp4"
  "33919|sea-sunset.mp4"
  "26300|ocean-waves.mp4"
  "14185|space-nebula.mp4"
  "4038|northern-lights.mp4"
  "1704|starry-lake.mp4"
  "4447|neon-japan.mp4"
  "2846|rainy-window.mp4"
  "4331|rainy-night-drive.mp4"
  "4332|rainy-city.mp4"
)

echo "Downloading ${#CLIPS[@]} background loops into $DEST ..."
fail=0
for pair in "${CLIPS[@]}"; do
  id="${pair%%|*}"
  fn="${pair##*|}"
  if [[ -s "$DEST/$fn" ]]; then
    printf '  • %-22s already present, skipping\n' "$fn"
    continue
  fi
  ok=0
  for res in 720 360; do
    url="https://assets.mixkit.co/videos/${id}/${id}-${res}.mp4"
    if curl -fsS -A "$UA" "$url" -o "$DEST/$fn" && [[ "$(wc -c < "$DEST/$fn")" -gt 50000 ]]; then
      printf '  ✓ %-22s (%sp)\n' "$fn" "$res"
      ok=1
      break
    fi
  done
  if [[ "$ok" -eq 0 ]]; then
    printf '  ✗ %-22s FAILED (mixkit id %s)\n' "$fn" "$id"
    rm -f "$DEST/$fn"
    fail=1
  fi
done

if [[ "$fail" -eq 0 ]]; then
  echo "Done. Rebuild the container to pick them up:  docker compose up -d --build"
else
  echo "Some downloads failed (Mixkit may have changed an id). The app still works without them." >&2
  exit 1
fi

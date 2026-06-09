#!/usr/bin/env bash
#
# check-stations.sh — health check for the YouTube IDs in public/stations.json
#
# YouTube 24/7 "radio" streams rotate video IDs over time, so stations go dead.
# This script asks YouTube's oEmbed endpoint about every videoId and reports
# which ones are no longer embeddable (removed, private, or embedding disabled).
#
# Usage:
#   ./scripts/check-stations.sh              # check public/stations.json
#   ./scripts/check-stations.sh path.json    # check a specific file
#
# Exit code is non-zero if any station is broken (handy for cron / CI).
#
# Deps: bash, curl, python3 (all already present on this host).

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
FILE="${1:-$ROOT/public/stations.json}"

if [[ ! -f "$FILE" ]]; then
  echo "error: stations file not found: $FILE" >&2
  exit 2
fi

echo "Checking stations in: $FILE"
echo

# Emit "category<TAB>name<TAB>videoId" rows.
rows="$(python3 - "$FILE" <<'PY'
import json, sys
data = json.load(open(sys.argv[1]))
for cat in data["categories"]:
    for st in cat["stations"]:
        # Only YouTube stations can be checked via oEmbed; skip HTML5 audio ones.
        vid = st.get("videoId")
        if not vid:
            continue
        print(f"{cat['name']}\t{st['name']}\t{vid}")
PY
)"

broken=0
total=0
current_cat=""

while IFS=$'\t' read -r cat name vid; do
  [[ -z "${vid:-}" ]] && continue
  total=$((total + 1))

  if [[ "$cat" != "$current_cat" ]]; then
    current_cat="$cat"
    echo "── $cat"
  fi

  code="$(curl -s -o /dev/null -w '%{http_code}' \
    "https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${vid}&format=json")"

  case "$code" in
    200) status="ok" ;;
    401|403) status="EMBED-DISABLED" ;;
    404) status="GONE" ;;
    *) status="??? (HTTP $code)" ;;
  esac

  if [[ "$status" != "ok" ]]; then
    broken=$((broken + 1))
    printf '   \033[31m✗ %-28s %-13s %s\033[0m\n' "$name" "$vid" "$status"
  else
    printf '   \033[32m✓\033[0m %-28s %-13s\n' "$name" "$vid"
  fi

  # be polite to YouTube's endpoint
  sleep 0.2
done <<< "$rows"

echo
echo "Summary: $((total - broken))/$total OK, $broken broken."
[[ "$broken" -eq 0 ]] || {
  echo "Fix broken IDs in $FILE (find current live streams on the channel's /streams page), then rebuild:"
  echo "  docker compose up -d --build"
  exit 1
}

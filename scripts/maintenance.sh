#!/usr/bin/env bash
#
# maintenance.sh — periodic upkeep for the radio (run from cron):
#   1. refresh the Fantasy Lofi tab from currently-live streams
#   2. health-check every YouTube station (logs the dead ones)
#   3. rebuild the container only if stations.json actually changed
#
# Logs to maintenance.log in the repo root. Install via cron, e.g. weekly:
#   0 4 * * 0 /home/casaos/lofi-radio/scripts/maintenance.sh

set -u
cd "$(dirname "${BASH_SOURCE[0]}")/.."
LOG="maintenance.log"

echo "===== $(date '+%Y-%m-%d %H:%M:%S') =====" >> "$LOG"
before=$(md5sum public/stations.json 2>/dev/null | awk '{print $1}')

# NOTE: auto-refresh of a live-stream tab is disabled — the Fantasy live
# streams now live in the hand-curated "Game Lofi" tab (alongside mp3 mixes),
# and refresh_live_streams.py rewrites a whole category, which would clobber
# them. Re-run it manually if you want to regenerate a dedicated live tab.

# health check (non-zero exit = some stations broken; just log it)
bash scripts/check-stations.sh >> "$LOG" 2>&1 || echo "  ! health check flagged broken stations" >> "$LOG"

# 3) rebuild only if the station list changed
after=$(md5sum public/stations.json 2>/dev/null | awk '{print $1}')
if [ "$before" != "$after" ]; then
  echo "  stations.json changed — rebuilding" >> "$LOG"
  ./rebuild.sh >> "$LOG" 2>&1 && echo "  rebuild ok" >> "$LOG" || echo "  ! rebuild failed" >> "$LOG"
else
  echo "  no station changes — skipping rebuild" >> "$LOG"
fi
echo "done" >> "$LOG"

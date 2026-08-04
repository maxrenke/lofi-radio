#!/usr/bin/env python3
"""
refresh_sole_space.py — populate the "Sole Space" stations.json category
with a pinned video first, followed by the channel's latest uploads.

The app serves a static stations.json (no backend), so this can't be truly
"live at page load" — instead run this to (re)generate the category, then
rebuild the container. Safe to run on a cron (see maintenance.sh) so the
tab tracks new uploads automatically; each page load fetches a fresh,
uncached stations.json (see nginx.conf), so viewers see whatever this
script last wrote.

Usage:
  python3 scripts/refresh_sole_space.py
  python3 scripts/refresh_sole_space.py --channel @Solespace.mp3 \
      --category "Sole Space" --pin PLXccZVbAPo --count 12

Deps: stdlib only (urllib, json, re).
"""
import argparse
import json
import os
import re
import sys
import time
import urllib.request

UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36"
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
STATIONS = os.path.join(ROOT, "public", "stations.json")


def fetch(url, timeout=15):
    req = urllib.request.Request(url, headers={"User-Agent": UA})
    with urllib.request.urlopen(req, timeout=timeout) as r:
        return r.read().decode("utf-8", "ignore")


def latest_video_ids(channel, limit):
    """IDs from the channel's /videos tab, in the page's listed order
    (newest first for a default-sorted channel)."""
    handle = channel if channel.startswith("@") else "@" + channel
    html = fetch(f"https://www.youtube.com/{handle}/videos")
    seen, ids = set(), []
    for m in re.finditer(r'"videoId":"([\w-]{11})"', html):
        vid = m.group(1)
        if vid not in seen:
            seen.add(vid)
            ids.append(vid)
        if len(ids) >= limit:
            break
    return ids


def oembed_title(vid):
    """Return title if the video is embeddable, else None."""
    try:
        data = json.loads(
            fetch(f"https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v={vid}&format=json")
        )
        return data.get("title")
    except Exception:
        return None


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--channel", default="@Solespace.mp3", help="Channel handle")
    ap.add_argument("--category", default="Sole Space", help="Category name to create/replace")
    ap.add_argument("--pin", action="append", default=["PLXccZVbAPo"],
                     help="Video ID to force first (repeatable, in order). Default: apple juice.")
    ap.add_argument("--count", type=int, default=12, help="Total stations wanted")
    ap.add_argument("--thumb", default="hqdefault", help="Thumbnail quality")
    args = ap.parse_args()

    stations, seen = [], set()

    for vid in args.pin:
        title = oembed_title(vid)
        if not title:
            print(f"  ! pinned video {vid} is not embeddable/available — skipping", file=sys.stderr)
            continue
        stations.append({"name": title, "picture": f"https://i.ytimg.com/vi/{vid}/{args.thumb}.jpg", "videoId": vid})
        seen.add(vid)

    print(f"Fetching latest uploads for {args.channel} ...")
    candidates = latest_video_ids(args.channel, limit=args.count * 2)
    for vid in candidates:
        if len(stations) >= args.count:
            break
        if vid in seen:
            continue
        title = oembed_title(vid)
        if not title:
            continue  # not embeddable / removed
        stations.append({"name": title, "picture": f"https://i.ytimg.com/vi/{vid}/{args.thumb}.jpg", "videoId": vid})
        seen.add(vid)
        time.sleep(0.2)

    if not stations:
        print("No usable videos found; leaving stations.json unchanged.", file=sys.stderr)
        sys.exit(1)

    for s in stations:
        print(f"  ✓ {s['name'][:55]}  ({s['videoId']})")

    data = json.load(open(STATIONS, encoding="utf-8"))
    cats = [c for c in data["categories"] if c["name"] != args.category]
    idx = next((i for i, c in enumerate(data["categories"]) if c["name"] == args.category), None)
    new_cat = {"name": args.category, "stations": stations}
    if idx is not None:
        cats.insert(idx, new_cat)
    else:
        cats.append(new_cat)
    data["categories"] = cats

    with open(STATIONS, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2, ensure_ascii=False)
        f.write("\n")

    print(f"\nWrote {len(stations)} station(s) to category '{args.category}' in {STATIONS}")
    print("Rebuild to apply:  docker compose up -d --build")


if __name__ == "__main__":
    main()

#!/usr/bin/env python3
"""
refresh_live_streams.py — populate a stations.json category from a YouTube
channel's currently-live streams, using each stream's thumbnail as the icon.

The app serves a static stations.json (no backend), so this can't be truly
"live at page load" — instead run this to (re)generate a category, then rebuild
the container. Safe to run on a cron to keep the category fresh.

Usage:
  python3 scripts/refresh_live_streams.py --channel @FantasyLofi --category "Fantasy Lofi"
  python3 scripts/refresh_live_streams.py --channel @LofiGirl --category "Lofi Girl" --insert-after C89.5

Notes:
- Only streams that are currently LIVE are included. If liveness can't be
  determined for any (YouTube consent wall, etc.), it falls back to including
  every embeddable stream on the page (i.e. "assume they're live").
- Re-running replaces the same-named category in place.

Deps: stdlib only (urllib, json).
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


def video_ids_from_streams(channel):
    handle = channel if channel.startswith("@") else "@" + channel
    html = fetch(f"https://www.youtube.com/{handle}/streams")
    seen, ids = set(), []
    for m in re.finditer(r'"videoId":"([\w-]{11})"', html):
        vid = m.group(1)
        if vid not in seen:
            seen.add(vid)
            ids.append(vid)
    return ids


def oembed(vid):
    """Return title if the video is embeddable, else None."""
    try:
        data = json.loads(
            fetch(f"https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v={vid}&format=json")
        )
        return data.get("title")
    except Exception:
        return None


def is_live(vid):
    try:
        return '"isLiveNow":true' in fetch(f"https://www.youtube.com/watch?v={vid}")
    except Exception:
        return False


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--channel", required=True, help="Channel handle, e.g. @FantasyLofi")
    ap.add_argument("--category", required=True, help="Category name to create/replace")
    ap.add_argument("--insert-after", default=None, help="Place the category after this existing one")
    ap.add_argument("--thumb", default="hqdefault", help="Thumbnail quality (default/mqdefault/hqdefault/maxresdefault)")
    args = ap.parse_args()

    print(f"Fetching live streams for {args.channel} ...")
    ids = video_ids_from_streams(args.channel)
    print(f"  found {len(ids)} candidate stream(s)")

    live, embeddable = [], []
    for vid in ids:
        title = oembed(vid)
        if not title:
            continue  # not embeddable / removed
        entry = {
            "name": title,
            "picture": f"https://i.ytimg.com/vi/{vid}/{args.thumb}.jpg",
            "videoId": vid,
        }
        embeddable.append(entry)
        if is_live(vid):
            live.append(entry)
        time.sleep(0.2)

    stations = live
    if not stations:
        print("  ! couldn't confirm any as live — assuming all embeddable streams are live")
        stations = embeddable

    if not stations:
        print("No usable streams found; leaving stations.json unchanged.", file=sys.stderr)
        sys.exit(1)

    for s in stations:
        print(f"  ✓ {s['name'][:55]}  ({s['videoId']})")

    data = json.load(open(STATIONS, encoding="utf-8"))
    cats = data["categories"]
    cats = [c for c in cats if c["name"] != args.category]  # drop old copy
    new_cat = {"name": args.category, "stations": stations}

    if args.insert_after:
        idx = next((i for i, c in enumerate(cats) if c["name"] == args.insert_after), None)
        cats.insert(idx + 1 if idx is not None else len(cats), new_cat)
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

# 🎵 Lofi Radio — self-host fork

A self-hostable web radio for lo-fi, chill, and electronic music. This is a
fork of [**joan-tomas-1995/lofi-radio**](https://github.com/joan-tomas-1995/lofi-radio)
with a Docker deployment, a refreshed UI, looping video backgrounds, an audio
player that handles non-YouTube streams, and an integration with Seattle's
**C89.5 (KNHC)** for its live stream and on-demand shows.

It plays free, public 24/7 radio livestreams (YouTube) plus direct audio
streams, with selectable animated/video backgrounds — all from a single
container on your home server.

---

## ✨ What this fork adds

On top of the original React app:

- **🐳 Docker deployment** — `docker compose up -d --build`, served by nginx.
- **🎨 UI refresh** — glassmorphism panel, soft indigo/violet accent, rounded
  bundled icons (no broken external SVGs), centered compact layout, readable
  background dropdown, light/dark themes.
- **📺 Video backgrounds** — looping MP4 backgrounds in addition to the original
  animated GIFs, via a hidden `<video>` layer.
- **🔊 Dual-source player** — the player now supports **plain HTTP audio streams
  and MP3s** (HTML5 `<audio>`) alongside the original **YouTube** livestreams.
- **📻 C89.5 (KNHC) integration** — the station's live stream plus on-demand
  *Push the Tempo*, *PowerMix*, and *Cafe Chill* episodes.
- **🩺 Station health check** — a script that flags dead/removed YouTube streams
  (they rotate video IDs and break over time).
- **🧹 Curated & repaired station list** — broken stations replaced, duplicates
  removed, and a stack of Lofi Girl streams added (lofi, jazz, synth & ambient).

---

## 🚀 Quick start

```bash
git clone https://github.com/maxrenke/lofi-radio.git
cd lofi-radio

# (optional) download the video backgrounds — see "Backgrounds" below
./scripts/fetch-backgrounds.sh

docker compose up -d --build
```

Then open **http://localhost:6969** (or `http://<server-ip>:6969`).

> The included `deploy.sh` wraps the same steps with environment checks.

### Configuration

- **Port** — edit the `ports` mapping in `docker-compose.yml` (`6969:80`).
- **nginx** — `nginx.conf` is mounted into the container; tweak and restart.

---

## 🎬 Backgrounds

Backgrounds are listed in [`public/backgroundImages.json`](public/backgroundImages.json).
Each entry is `{ "name": ..., "url": ... }`:

- a **`.gif`/`.webp`/image** URL → applied as a CSS background image, or
- an **`.mp4`/`.webm`** URL → played in a fullscreen looping `<video>` layer.

The 12 video loops (🎬 entries) are **free-license stock from
[Mixkit](https://mixkit.co)**. The Mixkit Free License permits use in a project
but **prohibits redistributing the raw files**, so they are **not committed** to
this repo (`public/*.mp4` is gitignored). Download them with:

```bash
./scripts/fetch-backgrounds.sh
```

The app works fine without them — those background options simply won't appear
until fetched.

---

## 📻 C89.5 (KNHC) integration

The **C89.5** category contains:

| Station | Source |
| --- | --- |
| C89.5 Live | `https://knhc-ice.streamguys1.com/live` (direct audio stream) |
| Push the Tempo (Latest) | `/c895/c895_push_the_tempo/latest.mp3` |
| PowerMix (Latest) | `/c895/c895_powermix/latest.mp3` |
| Cafe Chill (Latest) | `/c895/c895_cafe_chill/latest.mp3` |

- The **live stream** works out of the box (no setup needed).
- The **on-demand** shows are served from a host directory bind-mounted into the
  container at `/c895/`. They rely on a companion **C895 on-demand downloader**
  that fetches each week's show into `/DATA/Media/Music/C895/<show>/` and
  maintains a `latest.mp3` symlink pointing at the newest episode.

If you don't run the downloader, remove or edit the on-demand mount in
`docker-compose.yml` and drop those three stations from `public/stations.json`:

```yaml
# docker-compose.yml
volumes:
  - /DATA/Media/Music/C895:/usr/share/nginx/html/c895:ro   # adjust or remove
```

---

## 🎚️ How stations work

Stations live in [`public/stations.json`](public/stations.json), grouped by
category. Each station is **either** a YouTube stream **or** a direct audio URL:

```jsonc
// YouTube livestream
{ "name": "Lofi Girl 📚", "picture": "lofi-girl.webp", "videoId": "X4VbdwhkE10" }

// Direct audio stream or mp3
{ "name": "C89.5 Live 📻", "picture": "c895.webp", "audio": "https://.../live" }
```

- `videoId` → played via the **YouTube IFrame API**.
- `audio` → played via an HTML5 `<audio>` element (live streams or mp3s).
- `picture` → a filename in `public/` (with a fallback if it fails to load).

### Checking for broken stations

YouTube 24/7 "radio" streams rotate their video IDs, so stations go dead over
time. Run the health check anytime:

```bash
./scripts/check-stations.sh        # or: npm run check-stations
```

It pings YouTube's oEmbed endpoint for every `videoId`, reports which are
`GONE`/`EMBED-DISABLED`, and exits non-zero if any are broken (handy for cron).
Audio stations are skipped.

---

## 🛠️ Development

```bash
npm install
npm run dev      # Vite dev server
npm run build    # production build to dist/
```

Stack: React + Vite, `react-icons`, `react-intl` (i18n), YouTube IFrame API,
nginx (production).

---

## 🙌 Credits & license

- Original app by **[Joan Tomás](https://github.com/joan-tomas-1995/lofi-radio)** (MIT).
- Video backgrounds: **[Mixkit](https://mixkit.co)** (Mixkit Free License).
- **[C89.5 / KNHC](https://www.c895.org)** — Seattle's nonprofit dance music
  station. All stream/show content belongs to them; please support the station.
- Station artwork and logos are property of their respective channels.

This fork inherits the upstream **MIT** license. Third-party media (videos,
station streams, logos) remains under its own terms.
